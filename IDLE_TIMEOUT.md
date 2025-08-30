# Idle Timeout Feature

## Overview
The password manager now includes a 30-minute idle timeout feature that automatically logs users out after a period of inactivity, enhancing security by preventing unauthorized access to unattended sessions.

## Implementation Details

### AuthContext Changes
- Added `logoutReason` state to track why a user was logged out
- Added `clearLogoutReason` function to clear logout reason messages
- Implemented idle timeout timer using `setTimeout` and activity listeners
- Added activity detection for: mousedown, mousemove, keypress, scroll, touchstart, click

### Login Page Changes
- Both `AuthLayout.tsx` and `AuthLayoutClean.tsx` now display logout reason messages
- Logout reason messages appear as dismissible error alerts
- Messages automatically clear after 10 seconds or can be manually dismissed

### Security Features
- **30-minute timeout**: Users are automatically logged out after 30 minutes of inactivity
- **Activity detection**: Any user interaction resets the idle timer
- **Secure logout**: Timer is cleared when user manually logs out
- **Session cleanup**: Token and user data are removed from localStorage on timeout

### User Experience
- Clear messaging when logged out due to inactivity
- Toast notifications for both manual and automatic logouts
- Dismissible logout reason alerts on login page
- Seamless timer reset on any user activity

## Usage

### For Users
1. **Normal usage**: The timer runs silently in the background and resets with any activity
2. **Idle logout**: After 30 minutes of inactivity, users are automatically logged out
3. **Re-login**: Users see a clear message explaining why they were logged out
4. **Manual logout**: Users can still manually log out using the logout button

### For Developers
```typescript
// Access logout reason and clear function
const { logoutReason, clearLogoutReason } = useAuth();

// Manual logout with custom reason
logout('Custom logout reason');

// Normal logout (no reason)
logout();
```

## Configuration
To modify the timeout duration, update the `IDLE_TIMEOUT` constant in `AuthContext.tsx`:
```typescript
// Change from 30 minutes to desired duration
const IDLE_TIMEOUT = 30 * 60 * 1000; // milliseconds
```

## Testing
The feature can be tested by:
1. Logging into the application
2. Leaving the browser inactive for 30 minutes
3. Observing the automatic logout with appropriate messaging
4. Verifying the logout reason appears on the login page

For faster testing during development, temporarily reduce the `IDLE_TIMEOUT` value to a shorter duration.
