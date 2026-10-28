import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { SAMPLE_PROFILES, DEFAULT_CONSENT_SETTINGS, formatDate } from '../data/sampleProfiles';
import { CLINICAL_RULES } from '../data/clinicalRules';
import { 
  calculateCycleDayForDate, 
  computeSummaryMetricsFromLogs, 
  getEstimatedNextPeriod 
} from '../utils/cycleCalculations';
import { api, tokenStorage } from '../services/api';

const AppContext = createContext();

const STORAGE_KEY_PROFILE = 'saheli_profile_id';
const STORAGE_KEY_PROFILES_DATA = 'saheli_profiles_data';
const STORAGE_KEY_AUTH_USER = 'saheli_auth_user';

// Helper to normalize question objects
function normalizeQuestions(questions = []) {
  return questions.map((q, idx) => {
    if (typeof q === 'string') {
      return { id: `q-${idx}-${Date.now()}`, text: q, inReport: true };
    }
    return {
      id: q.id || `q-${idx}`,
      text: q.text || '',
      inReport: q.inReport !== false
    };
  });
}

export function AppProvider({ children }) {
  // Authentication & Backend Status
  const [authUser, setAuthUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem(STORAGE_KEY_AUTH_USER);
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [isBackendConnected, setIsBackendConnected] = useState(false);

  // Load current active profile id
  const [profileId, setProfileId] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PROFILE);
      return saved && (SAMPLE_PROFILES[saved] || saved === 'amara' || saved.startsWith('usr_')) ? saved : 'amara';
    } catch {
      return 'amara';
    }
  });

  // Load profiles dictionary (allowing edits to persist locally)
  const [profiles, setProfiles] = useState(() => {
    try {
      const savedData = localStorage.getItem(STORAGE_KEY_PROFILES_DATA);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        const merged = { ...SAMPLE_PROFILES };
        Object.keys(parsed).forEach((k) => {
          merged[k] = {
            ...SAMPLE_PROFILES[k],
            ...parsed[k],
            consentSettings: {
              ...DEFAULT_CONSENT_SETTINGS,
              ...(parsed[k]?.consentSettings || {})
            },
            customQuestions: normalizeQuestions(parsed[k]?.customQuestions || SAMPLE_PROFILES[k]?.customQuestions)
          };
        });
        return merged;
      }
    } catch (e) {
      console.error('Failed to load local storage profiles:', e);
    }
    return SAMPLE_PROFILES;
  });

  // Toast Notification state
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ id: Date.now(), message, type });
    setTimeout(() => {
      setToast(null);
    }, 3800);
  };

  // Mobile navigation drawer state
  const [isMobileNavDrawerOpen, setIsMobileNavDrawerOpen] = useState(false);

  // Modals state
  const [isUrgentModalOpen, setIsUrgentModalOpen] = useState(false);
  const [isDisclaimerModalOpen, setIsDisclaimerModalOpen] = useState(false);
  const [activeEvidenceRule, setActiveEvidenceRule] = useState(null);
  const [activeEduArticle, setActiveEduArticle] = useState(null);

  // Active profile
  const currentProfile = profiles[profileId] || SAMPLE_PROFILES.amara;
  const logs = currentProfile.logs || {};

  // Check backend health & auto-sync on boot
  useEffect(() => {
    let isMounted = true;

    async function checkAndSync() {
      const healthRes = await api.health.check();
      if (isMounted && healthRes.success) {
        setIsBackendConnected(true);

        // If auth token exists, verify /me and sync profile
        if (tokenStorage.getAccessToken()) {
          const meRes = await api.auth.me();
          if (isMounted && meRes.success && meRes.data?.user) {
            setAuthUser(meRes.data.user);
            try {
              localStorage.setItem(STORAGE_KEY_AUTH_USER, JSON.stringify(meRes.data.user));
            } catch {}

            if (meRes.data.profile) {
              const serverProfile = meRes.data.profile;
              // Fetch remote logs
              const logsRes = await api.logs.get(serverProfile.id);
              const serverLogs = logsRes.success && logsRes.data ? logsRes.data : {};

              setProfiles((prev) => ({
                ...prev,
                [serverProfile.id]: {
                  ...(prev[serverProfile.id] || {}),
                  ...serverProfile,
                  logs: {
                    ...(prev[serverProfile.id]?.logs || {}),
                    ...serverLogs
                  }
                }
              }));
              setProfileId(serverProfile.id);
            }
          }
        }
      } else if (isMounted) {
        setIsBackendConnected(false);
      }
    }

    checkAndSync();
    return () => {
      isMounted = false;
    };
  }, []);

  // Persist local state whenever profiles or profileId changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PROFILE, profileId);
      localStorage.setItem(STORAGE_KEY_PROFILES_DATA, JSON.stringify(profiles));
    } catch (e) {
      console.error('Failed to persist to localStorage:', e);
    }
  }, [profileId, profiles]);

  // Auth Operations
  const loginUser = async (email, password) => {
    const res = await api.auth.login(email, password);
    if (res.success && res.data?.user) {
      setAuthUser(res.data.user);
      try {
        localStorage.setItem(STORAGE_KEY_AUTH_USER, JSON.stringify(res.data.user));
      } catch {}

      if (res.data.profile) {
        const p = res.data.profile;
        setProfiles((prev) => ({
          ...prev,
          [p.id]: {
            ...(prev[p.id] || {}),
            ...p,
            logs: prev[p.id]?.logs || {}
          }
        }));
        setProfileId(p.id);
      }
      showToast(`Welcome back, ${res.data.user.name}!`);
      return { success: true, user: res.data.user };
    }

    if (res.isOffline) {
      // Offline fallback: match demo persona by email
      const matchedKey = Object.keys(SAMPLE_PROFILES).find(
        (k) => SAMPLE_PROFILES[k].name.toLowerCase().includes(email.split('@')[0].split('.')[0])
      ) || 'amara';
      setProfileId(matchedKey);
      showToast(`Logged in locally as ${SAMPLE_PROFILES[matchedKey]?.name || 'Demo User'} (Offline Sandbox)`);
      return { success: true, isOffline: true };
    }

    showToast(res.error || 'Authentication failed', 'error');
    return { success: false, error: res.error };
  };

  const signupUser = async (name, email, password) => {
    const res = await api.auth.signup(name, email, password);
    if (res.success && res.data?.user) {
      setAuthUser(res.data.user);
      try {
        localStorage.setItem(STORAGE_KEY_AUTH_USER, JSON.stringify(res.data.user));
      } catch {}

      if (res.data.profile) {
        const p = res.data.profile;
        setProfiles((prev) => ({
          ...prev,
          [p.id]: {
            ...p,
            logs: {}
          }
        }));
        setProfileId(p.id);
      }
      showToast(`Welcome to Saheli, ${res.data.user.name}!`);
      return { success: true, user: res.data.user };
    }

    if (res.isOffline) {
      const newId = `usr_${Date.now()}`;
      setProfiles((prev) => ({
        ...prev,
        [newId]: {
          id: newId,
          name: name.trim(),
          age: null,
          typicalCycleLength: 28,
          typicalPeriodLength: 5,
          logs: {},
          customQuestions: [{ id: `q1_${Date.now()}`, text: 'How do my symptoms compare to expected menstrual patterns?', inReport: true }]
        }
      }));
      setProfileId(newId);
      showToast(`Account created locally as ${name} (Offline Sandbox)`);
      return { success: true, isOffline: true };
    }

    showToast(res.error || 'Registration failed', 'error');
    return { success: false, error: res.error };
  };

  const logoutUser = async () => {
    await api.auth.logout();
    tokenStorage.clearTokens();
    setAuthUser(null);
    localStorage.removeItem(STORAGE_KEY_AUTH_USER);
    showToast('Signed out successfully.');
  };

  // Switch persona profile
  const switchProfile = (newId) => {
    if (profiles[newId] || SAMPLE_PROFILES[newId]) {
      setProfileId(newId);
      showToast(`Switched active profile to ${profiles[newId]?.name || newId}`);
    }
  };

  // Reset to initial sample data
  const resetToFactorySampleData = () => {
    setProfiles(SAMPLE_PROFILES);
    setProfileId('amara');
    localStorage.removeItem(STORAGE_KEY_PROFILES_DATA);
    localStorage.removeItem(STORAGE_KEY_PROFILE);
    showToast('Reset to original sample data successfully');
  };

  // Clear all local & remote data (for Privacy page)
  const clearAllData = async () => {
    const blankProfiles = {
      ...SAMPLE_PROFILES,
      guest: {
        ...SAMPLE_PROFILES.guest,
        logs: {},
        customQuestions: normalizeQuestions(SAMPLE_PROFILES.guest.customQuestions)
      }
    };
    setProfiles(blankProfiles);
    setProfileId('guest');
    localStorage.clear();

    // Trigger backend data wipe if connected
    api.backup.wipeData(profileId).catch(() => {});
    showToast('All local logs and stored data cleared.');
  };

  // Today key
  const todayKey = formatDate(new Date());
  const todayEntry = logs[todayKey] || null;

  // Single source for Cycle Day and Phase calculations
  const getCycleDayInfo = (dateStr = todayKey) => {
    return calculateCycleDayForDate(dateStr, logs, currentProfile);
  };

  // Dynamic Today Cycle Metrics
  const todayCycleMetrics = useMemo(() => {
    return calculateCycleDayForDate(todayKey, logs, currentProfile);
  }, [todayKey, logs, currentProfile]);

  // Estimated next period
  const estimatedNextPeriod = useMemo(() => {
    return getEstimatedNextPeriod(logs, currentProfile, todayKey);
  }, [logs, currentProfile, todayKey]);

  // Save entry (supports async feedback & backend sync)
  const [isSavingEntry, setIsSavingEntry] = useState(false);
  const saveEntry = async (entryData) => {
    setIsSavingEntry(true);
    const dateKey = entryData.date || todayKey;

    if (Number(entryData.painScore) >= 9) {
      setIsUrgentModalOpen(true);
    }

    try {
      // 1. Optimistic local update
      setProfiles((prev) => {
        const active = prev[profileId] || SAMPLE_PROFILES.amara;
        const updatedLogs = {
          ...active.logs,
          [dateKey]: {
            ...entryData,
            date: dateKey,
            updatedAt: new Date().toISOString()
          }
        };
        return {
          ...prev,
          [profileId]: {
            ...active,
            logs: updatedLogs
          }
        };
      });

      // 2. Asynchronous backend persistence
      const syncRes = await api.logs.upsert(profileId, dateKey, entryData);
      if (syncRes.success && syncRes.data?.safetyAlerts?.length > 0) {
        const hasUrgent = syncRes.data.safetyAlerts.some((a) => a.severity === 'urgent');
        if (hasUrgent) {
          setIsUrgentModalOpen(true);
        }
      }

      showToast(`Saved check-in for ${dateKey}`);
      return { success: true };
    } catch (err) {
      showToast('Failed to save entry. Please try again.', 'error');
      return { success: false, error: err };
    } finally {
      setIsSavingEntry(false);
    }
  };

  // Delete an entry
  const deleteEntry = (dateKey) => {
    setProfiles((prev) => {
      const active = prev[profileId] || SAMPLE_PROFILES.amara;
      const updatedLogs = { ...active.logs };
      delete updatedLogs[dateKey];
      return {
        ...prev,
        [profileId]: {
          ...active,
          logs: updatedLogs
        }
      };
    });

    api.logs.delete(profileId, dateKey).catch(() => {});
    showToast(`Deleted check-in entry for ${dateKey}`, 'info');
  };

  // Update profile attributes
  const updateProfile = (updates) => {
    setProfiles((prev) => ({
      ...prev,
      [profileId]: {
        ...prev[profileId],
        ...updates
      }
    }));

    api.profiles.update(profileId, updates).catch(() => {});
    showToast('Profile preferences updated');
  };

  // Update user consent preferences
  const updateConsentSettings = (consentUpdates) => {
    setProfiles((prev) => {
      const active = prev[profileId] || SAMPLE_PROFILES.amara;
      const updated = {
        ...DEFAULT_CONSENT_SETTINGS,
        ...(active.consentSettings || {}),
        ...consentUpdates
      };
      api.profiles.update(profileId, { consentSettings: updated }).catch(() => {});
      return {
        ...prev,
        [profileId]: {
          ...active,
          consentSettings: updated
        }
      };
    });
  };

  // Question Management: Add
  const addDoctorQuestion = (questionText) => {
    if (!questionText || !questionText.trim()) return;
    const currentQuestions = normalizeQuestions(currentProfile.customQuestions);
    const newQ = {
      id: `q-${Date.now()}`,
      text: questionText.trim(),
      inReport: true
    };
    const updated = [...currentQuestions, newQ];
    updateProfile({ customQuestions: updated });
    api.questions.update(profileId, updated).catch(() => {});
    showToast('Added discussion question to clinician brief');
  };

  // Question Management: Edit
  const editDoctorQuestion = (id, newText) => {
    if (!newText || !newText.trim()) return;
    const currentQuestions = normalizeQuestions(currentProfile.customQuestions);
    const updated = currentQuestions.map((q) =>
      q.id === id ? { ...q, text: newText.trim() } : q
    );
    updateProfile({ customQuestions: updated });
    api.questions.update(profileId, updated).catch(() => {});
    showToast('Question updated');
  };

  // Question Management: Reorder
  const moveDoctorQuestion = (index, direction) => {
    const currentQuestions = [...normalizeQuestions(currentProfile.customQuestions)];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= currentQuestions.length) return;
    
    const [moved] = currentQuestions.splice(index, 1);
    currentQuestions.splice(targetIndex, 0, moved);
    updateProfile({ customQuestions: currentQuestions });
    api.questions.update(profileId, currentQuestions).catch(() => {});
  };

  // Question Management: Toggle Report Inclusion
  const toggleDoctorQuestionInReport = (id) => {
    const currentQuestions = normalizeQuestions(currentProfile.customQuestions);
    const updated = currentQuestions.map((q) =>
      q.id === id ? { ...q, inReport: !q.inReport } : q
    );
    updateProfile({ customQuestions: updated });
    api.questions.update(profileId, updated).catch(() => {});
  };

  // Question Management: Remove
  const removeDoctorQuestion = (id) => {
    const currentQuestions = normalizeQuestions(currentProfile.customQuestions);
    const filtered = currentQuestions.filter((q) => q.id !== id);
    updateProfile({ customQuestions: filtered });
    api.questions.update(profileId, filtered).catch(() => {});
    showToast('Question removed from brief', 'info');
  };

  // Export all data as JSON
  const exportDataJSON = () => {
    const dataToExport = {
      exportVersion: '2.0',
      exportedAt: new Date().toISOString(),
      activeProfileId: profileId,
      profile: {
        ...currentProfile,
        customQuestions: normalizeQuestions(currentProfile.customQuestions)
      },
      disclaimer: 'Saheli local-first symptom diary backup. Unvalidated demonstration data.'
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(dataToExport, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `saheli_diary_${profileId}_${formatDate(new Date())}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Exported diary backup file (JSON)');
  };

  // Import JSON backup
  const importDataJSON = (jsonString) => {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.profile) {
        setProfiles((prev) => ({
          ...prev,
          [parsed.activeProfileId || 'guest']: {
            ...parsed.profile,
            customQuestions: normalizeQuestions(parsed.profile.customQuestions),
            consentSettings: {
              ...DEFAULT_CONSENT_SETTINGS,
              ...(parsed.profile.consentSettings || {})
            }
          }
        }));
        setProfileId(parsed.activeProfileId || 'guest');
        api.backup.import(parsed.activeProfileId || 'guest', parsed).catch(() => {});
        showToast('Successfully restored backup records');
        return { success: true };
      } else if (parsed.allProfiles) {
        setProfiles(parsed.allProfiles);
        if (parsed.activeProfileId) setProfileId(parsed.activeProfileId);
        showToast('Successfully restored backup records');
        return { success: true };
      } else {
        throw new Error('Unrecognized diary format');
      }
    } catch (err) {
      showToast('Failed to import file: invalid format', 'error');
      return { success: false, error: err.message };
    }
  };

  // Evaluate clinical rules dynamically against current logs
  const detectedPatterns = useMemo(() => {
    return CLINICAL_RULES.map((rule) => {
      const evaluation = rule.evaluate(logs, currentProfile);
      return {
        ...rule,
        ...evaluation
      };
    });
  }, [logs, currentProfile]);

  // Overall metrics summary strictly from logs
  const summaryMetrics = useMemo(() => {
    return computeSummaryMetricsFromLogs(logs);
  }, [logs]);

  return (
    <AppContext.Provider
      value={{
        profileId,
        currentProfile: {
          ...currentProfile,
          customQuestions: normalizeQuestions(currentProfile.customQuestions),
          consentSettings: currentProfile.consentSettings || DEFAULT_CONSENT_SETTINGS,
          currentCycleDay: todayCycleMetrics.cycleDay,
          currentPhase: todayCycleMetrics.phase,
          daysUntilNextPeriod: estimatedNextPeriod.daysUntil
        },
        profiles,
        logs,
        todayKey,
        todayEntry,
        todayCycleMetrics,
        estimatedNextPeriod,
        summaryMetrics,
        detectedPatterns,
        getCycleDayInfo,
        switchProfile,
        saveEntry,
        isSavingEntry,
        deleteEntry,
        updateProfile,
        updateConsentSettings,
        addDoctorQuestion,
        editDoctorQuestion,
        moveDoctorQuestion,
        removeDoctorQuestion,
        toggleDoctorQuestionInReport,
        exportDataJSON,
        importDataJSON,
        resetToFactorySampleData,
        clearAllData,
        toast,
        showToast,
        isUrgentModalOpen,
        setIsUrgentModalOpen,
        isDisclaimerModalOpen,
        setIsDisclaimerModalOpen,
        activeEvidenceRule,
        setActiveEvidenceRule,
        activeEduArticle,
        setActiveEduArticle,
        isMobileNavDrawerOpen,
        setIsMobileNavDrawerOpen,
        isBackendConnected,
        authUser,
        loginUser,
        signupUser,
        logoutUser,
        api
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
