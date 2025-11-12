import AsyncStorage from '@react-native-async-storage/async-storage';

const SESSIONS_KEY = '@attendance_sessions';
const ACTIVE_SESSION_KEY = '@active_session';

// Session Management
export const getAllSessions = async () => {
  try {
    const data = await AsyncStorage.getItem(SESSIONS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting sessions:', error);
    return [];
  }
};

export const createSession = async (date) => {
  try {
    const sessions = await getAllSessions();
    const newSession = {
      id: Date.now().toString(),
      date: date,
      createdAt: new Date().toISOString(),
      idAttendance: [],
      forgotIdAttendance: [],
      completed: false,
    };
    sessions.push(newSession);
    await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
    return newSession;
  } catch (error) {
    console.error('Error creating session:', error);
    return null;
  }
};

export const getActiveSession = async () => {
  try {
    const data = await AsyncStorage.getItem(ACTIVE_SESSION_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error getting active session:', error);
    return null;
  }
};

export const setActiveSession = async (session) => {
  try {
    await AsyncStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
    return true;
  } catch (error) {
    console.error('Error setting active session:', error);
    return false;
  }
};

export const clearActiveSession = async () => {
  try {
    await AsyncStorage.removeItem(ACTIVE_SESSION_KEY);
    return true;
  } catch (error) {
    console.error('Error clearing active session:', error);
    return false;
  }
};

// Add attendance to active session
export const addIdAttendance = async (id) => {
  try {
    const activeSession = await getActiveSession();
    if (!activeSession) return false;

    const entry = {
      id: id,
      timestamp: new Date().toISOString(),
    };

    activeSession.idAttendance.push(entry);
    await setActiveSession(activeSession);

    // Update in sessions list
    const sessions = await getAllSessions();
    const index = sessions.findIndex(s => s.id === activeSession.id);
    if (index !== -1) {
      sessions[index] = activeSession;
      await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
    }

    return true;
  } catch (error) {
    console.error('Error adding ID attendance:', error);
    return false;
  }
};

export const addForgotIdAttendance = async (userData) => {
  try {
    const activeSession = await getActiveSession();
    if (!activeSession) return false;

    const entry = {
      fullName: userData.fullName || '',
      department: userData.department || '',
      phoneNumber: userData.phoneNumber || '',
      timestamp: new Date().toISOString(),
    };

    activeSession.forgotIdAttendance.push(entry);
    await setActiveSession(activeSession);

    // Update in sessions list
    const sessions = await getAllSessions();
    const index = sessions.findIndex(s => s.id === activeSession.id);
    if (index !== -1) {
      sessions[index] = activeSession;
      await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
    }

    return true;
  } catch (error) {
    console.error('Error adding forgot ID attendance:', error);
    return false;
  }
};

// Complete session
export const completeSession = async () => {
  try {
    const activeSession = await getActiveSession();
    if (!activeSession) return false;

    activeSession.completed = true;
    activeSession.completedAt = new Date().toISOString();

    // Update in sessions list
    const sessions = await getAllSessions();
    const index = sessions.findIndex(s => s.id === activeSession.id);
    if (index !== -1) {
      sessions[index] = activeSession;
      await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
    }

    await clearActiveSession();
    return true;
  } catch (error) {
    console.error('Error completing session:', error);
    return false;
  }
};

// Delete session
export const deleteSession = async (sessionId) => {
  try {
    const sessions = await getAllSessions();
    const filteredSessions = sessions.filter(s => s.id !== sessionId);
    await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(filteredSessions));
    return true;
  } catch (error) {
    console.error('Error deleting session:', error);
    return false;
  }
};

// Get session by ID
export const getSessionById = async (sessionId) => {
  try {
    const sessions = await getAllSessions();
    return sessions.find(s => s.id === sessionId) || null;
  } catch (error) {
    console.error('Error getting session by ID:', error);
    return null;
  }
};

// Delete ID attendance entry
export const deleteIdAttendance = async (index) => {
  try {
    const activeSession = await getActiveSession();
    if (!activeSession) return false;

    activeSession.idAttendance.splice(index, 1);
    await setActiveSession(activeSession);

    // Update in sessions list
    const sessions = await getAllSessions();
    const sessionIndex = sessions.findIndex(s => s.id === activeSession.id);
    if (sessionIndex !== -1) {
      sessions[sessionIndex] = activeSession;
      await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
    }

    return true;
  } catch (error) {
    console.error('Error deleting ID attendance:', error);
    return false;
  }
};

// Delete Forgot ID attendance entry
export const deleteForgotIdAttendance = async (index) => {
  try {
    const activeSession = await getActiveSession();
    if (!activeSession) return false;

    activeSession.forgotIdAttendance.splice(index, 1);
    await setActiveSession(activeSession);

    // Update in sessions list
    const sessions = await getAllSessions();
    const sessionIndex = sessions.findIndex(s => s.id === activeSession.id);
    if (sessionIndex !== -1) {
      sessions[sessionIndex] = activeSession;
      await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
    }

    return true;
  } catch (error) {
    console.error('Error deleting forgot ID attendance:', error);
    return false;
  }
};

// Update ID attendance entry
export const updateIdAttendance = async (index, newId) => {
  try {
    const activeSession = await getActiveSession();
    if (!activeSession) return false;

    activeSession.idAttendance[index].id = newId;
    await setActiveSession(activeSession);

    // Update in sessions list
    const sessions = await getAllSessions();
    const sessionIndex = sessions.findIndex(s => s.id === activeSession.id);
    if (sessionIndex !== -1) {
      sessions[sessionIndex] = activeSession;
      await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
    }

    return true;
  } catch (error) {
    console.error('Error updating ID attendance:', error);
    return false;
  }
};

// Update Forgot ID attendance entry
export const updateForgotIdAttendance = async (index, userData) => {
  try {
    const activeSession = await getActiveSession();
    if (!activeSession) return false;

    activeSession.forgotIdAttendance[index] = {
      ...activeSession.forgotIdAttendance[index],
      fullName: userData.fullName || '',
      department: userData.department || '',
      phoneNumber: userData.phoneNumber || '',
    };
    await setActiveSession(activeSession);

    // Update in sessions list
    const sessions = await getAllSessions();
    const sessionIndex = sessions.findIndex(s => s.id === activeSession.id);
    if (sessionIndex !== -1) {
      sessions[sessionIndex] = activeSession;
      await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
    }

    return true;
  } catch (error) {
    console.error('Error updating forgot ID attendance:', error);
    return false;
  }
};

// Clear all data
export const clearAllData = async () => {
  try {
    await AsyncStorage.removeItem(SESSIONS_KEY);
    await AsyncStorage.removeItem(ACTIVE_SESSION_KEY);
    return true;
  } catch (error) {
    console.error('Error clearing all data:', error);
    return false;
  }
};
