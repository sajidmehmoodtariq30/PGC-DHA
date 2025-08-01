import React, { createContext, useReducer, useEffect, useCallback } from 'react';
import { authAPI, getUserData, clearTokens, getAccessToken } from '../services/api';

// Initial state
const initialState = {
  isAuthenticated: false,
  isLoading: true,
  user: null,
  error: null,
  permissions: []
};

// Action types
const AUTH_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGOUT: 'LOGOUT',
  SET_USER: 'SET_USER',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  UPDATE_PROFILE: 'UPDATE_PROFILE'
};

// Reducer function
const authReducer = (state, action) => {
  switch (action.type) {
    case AUTH_ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload
      };

    case AUTH_ACTIONS.LOGIN_SUCCESS:
      return {
        ...state,
        isAuthenticated: true,
        isLoading: false,
        user: action.payload.user,
        permissions: action.payload.permissions || [],
        error: null
      };

    case AUTH_ACTIONS.LOGIN_FAILURE:
      return {
        ...state,
        isAuthenticated: false,
        isLoading: false,
        user: null,
        permissions: [],
        error: action.payload
      };

    case AUTH_ACTIONS.LOGOUT:
      return {
        ...initialState,
        isLoading: false
      };

    case AUTH_ACTIONS.SET_USER:
      return {
        ...state,
        user: action.payload.user,
        permissions: action.payload.permissions || state.permissions,
        isAuthenticated: true,
        isLoading: false
      };

    case AUTH_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        isLoading: false
      };

    case AUTH_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null
      };

    case AUTH_ACTIONS.UPDATE_PROFILE:
      return {
        ...state,
        user: { ...state.user, ...action.payload }
      };

    default:
      return state;
  }
};

// Create context
const AuthContext = createContext();

// Auth provider component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  const initializeAuth = useCallback(async () => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });

      const token = getAccessToken();
      const userData = getUserData();
      
      console.log('Auth initialization:', { hasToken: !!token, hasUserData: !!userData, userRole: userData?.role });

      if (token && userData) {
        // First, restore user state from localStorage
        console.log('Restoring user from localStorage:', userData);
        dispatch({
          type: AUTH_ACTIONS.LOGIN_SUCCESS,
          payload: {
            user: userData,
            permissions: userData.permissions || []
          }
        });

        // Then verify token is still valid in background
        try {
          const response = await authAPI.getCurrentUser();
          if (response.success) {
            console.log('Token verification successful, updating with fresh data');
            // Update with fresh data from server - extract user from response
            const freshUserData = response.data.user || response.data;
            dispatch({
              type: AUTH_ACTIONS.LOGIN_SUCCESS,
              payload: {
                user: freshUserData,
                permissions: freshUserData.permissions || []
              }
            });
          } else {
            throw new Error('Invalid session');
          }
        } catch (verifyError) {
          console.log('Token verification failed:', verifyError);
          // Only clear if the token is actually invalid (401), not on network errors
          if (verifyError.status === 401 || verifyError.message?.includes('401')) {
            console.log('Token is invalid, clearing auth state');
            clearTokens();
            dispatch({ type: AUTH_ACTIONS.LOGOUT });
          } else {
            console.log('Network/server error, keeping user logged in with cached data');
          }
          // For other errors (network, server down), keep user logged in with cached data
        }
      } else {
        console.log('No token or user data found, user not authenticated');
        dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
    }
  }, []);

  // Initialize auth state on app load
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Login function - memoized to prevent infinite loops
  const login = useCallback(async (credentials) => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
      dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });

      const response = await authAPI.login(credentials);

      if (response.success) {
        console.log('Login successful, user data:', response.data.user);
        dispatch({
          type: AUTH_ACTIONS.LOGIN_SUCCESS,
          payload: {
            user: response.data.user,
            permissions: response.data.user.permissions || []
          }
        });
        return { success: true, data: response.data };
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (error) {
      const errorMessage = error.message || 'Login failed';
      dispatch({
        type: AUTH_ACTIONS.LOGIN_FAILURE,
        payload: errorMessage
      });
      return { success: false, error: errorMessage };
    }
  }, []);

  // Register function - memoized to prevent infinite loops
  const register = useCallback(async (userData) => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
      dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });

      const response = await authAPI.register(userData);

      if (response.success) {
        dispatch({
          type: AUTH_ACTIONS.LOGIN_SUCCESS,
          payload: {
            user: response.data.user,
            permissions: response.data.user.permissions || []
          }
        });
        return { success: true, data: response.data };
      } else {
        throw new Error(response.message || 'Registration failed');
      }
    } catch (error) {
      const errorMessage = error.message || 'Registration failed';
      dispatch({
        type: AUTH_ACTIONS.SET_ERROR,
        payload: errorMessage
      });
      return { success: false, error: errorMessage };
    }
  }, []);

  // Logout function - memoized to prevent infinite loops
  const logout = useCallback(async (logoutAll = false) => {
    try {
      if (logoutAll) {
        await authAPI.logoutAll();
      } else {
        await authAPI.logout();
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
    }
  }, []);

  // Update profile function
  const updateProfile = async (profileData) => {
    try {
      const response = await authAPI.updateProfile(profileData);
      
      if (response.success) {
        dispatch({
          type: AUTH_ACTIONS.UPDATE_PROFILE,
          payload: response.data
        });
        return { success: true, data: response.data };
      } else {
        throw new Error(response.message || 'Profile update failed');
      }
    } catch (error) {
      const errorMessage = error.message || 'Profile update failed';
      return { success: false, error: errorMessage };
    }
  };

  // Change password function
  const changePassword = async (passwordData) => {
    try {
      const response = await authAPI.changePassword(passwordData);
      return { success: true, data: response.data };
    } catch (error) {
      const errorMessage = error.message || 'Password change failed';
      return { success: false, error: errorMessage };
    }
  };

  // Forgot password function
  const forgotPassword = async (email) => {
    try {
      const response = await authAPI.forgotPassword(email);
      return { success: true, data: response.data };
    } catch (error) {
      const errorMessage = error.message || 'Password reset request failed';
      return { success: false, error: errorMessage };
    }
  };

  // Reset password function
  const resetPassword = async (resetData) => {
    try {
      const response = await authAPI.resetPassword(resetData);
      return { success: true, data: response.data };
    } catch (error) {
      const errorMessage = error.message || 'Password reset failed';
      return { success: false, error: errorMessage };
    }
  };

  // Check if user has permission
  const hasPermission = (permission) => {
    if (!state.user) return false;
    
    // InstituteAdmin has all permissions
    if (state.user.role === 'InstituteAdmin') return true;
    
    // Check if user has the specific permission
    return state.permissions.some(perm => perm.name === permission);
  };

  // Check if user has role
  const hasRole = (role) => {
    if (!state.user) return false;
    return state.user.role === role;
  };

  // Check if user has any of the specified roles
  const hasAnyRole = (roles) => {
    if (!state.user) return false;
    return roles.includes(state.user.role);
  };

  // Clear error function - memoized to prevent infinite loops
  const clearError = useCallback(() => {
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
  }, []);

  // Get user sessions
  const getSessions = async () => {
    try {
      const response = await authAPI.getSessions();
      return { success: true, data: response.data };
    } catch (error) {
      const errorMessage = error.message || 'Failed to get sessions';
      return { success: false, error: errorMessage };
    }
  };

  // Revoke session
  const revokeSession = async (sessionId) => {
    try {
      const response = await authAPI.revokeSession(sessionId);
      return { success: true, data: response.data };
    } catch (error) {
      const errorMessage = error.message || 'Failed to revoke session';
      return { success: false, error: errorMessage };
    }
  };

  // Context value
  const value = {
    // State
    ...state,
    
    // Actions
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    forgotPassword,
    resetPassword,
    clearError,
    getSessions,
    revokeSession,
    
    // Utility functions
    hasPermission,
    hasRole,
    hasAnyRole,
    
    // User info shortcuts
    isInstituteAdmin: state.user?.role === 'InstituteAdmin',
    isCollegeAdmin: state.user?.role === 'CollegeAdmin',
    isTeacher: state.user?.role === 'Teacher',
    isStudent: state.user?.role === 'Student',
    isSRO: state.user?.role === 'SRO',
    isAccounts: state.user?.role === 'Accounts',
    isIT: state.user?.role === 'IT',
    isEMS: state.user?.role === 'EMS'
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
