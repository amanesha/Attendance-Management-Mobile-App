# Attendance Management System

A professional and simple React Native attendance system built with Expo. This app allows you to create attendance sessions by date, mark attendance with either ID or full details (for those who forgot their ID), and export data to Excel.

## Features

### 1. Splash Screen
- Professional animated splash screen with checkmark icon
- Auto-navigates to main screen after 2.5 seconds

### 2. Main Screen - Session Management
- **+ Button**: Floating action button to create new attendance sessions
- **Date Picker**: Select date when creating a new session
- **Sessions List**: View all your attendance sessions
  - Shows session date and time
  - Displays status (Completed/In Progress)
  - Shows total attendance count
  - Breakdown of "With ID" vs "Forgot ID" counts
- **Export Button**: Export individual session to Excel (separate sheets for ID and Forgot ID)
- **Delete Button**: Remove sessions
- **Pull to Refresh**: Refresh sessions list

### 3. Attendance Entry Screen
- **Toggle Switch**: "Forgot ID?" to switch between ID entry and full details
- **Real-time Statistics**: Shows current counts at the top
  - With ID count
  - Forgot ID count
  - Total count

#### ID Entry Mode (Default)
- Single field for Student/Employee ID
- Quick and simple entry

#### Forgot ID Mode (Toggle ON)
- Full Name (Optional)
- Department (Optional)
- Phone Number (Optional)
- ID field is disabled when toggled
- At least one field required

### 4. Live Attendance Lists
- Lists appear below the form as you add entries
- **With ID List**: Shows all ID entries with timestamps
- **Forgot ID List**: Shows all detailed entries with timestamps
- Numbered entries
- Real-time updates

### 5. Finish Session
- **Finish Button**: Complete the session and save all data
- Prompts confirmation with total count
- Returns to main screen after completion
- Data persists locally

### 6. Excel Export
- Export from main screen for each session
- Creates separate sheets:
  - **ID Attendance**: No, ID, Time
  - **Forgot ID**: No, Full Name, Department, Phone Number, Time
- Share directly from the app

## Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npx expo start
```

3. Run on your device:
   - **Android**: Press `a` for Android emulator or scan QR code with Expo Go
   - **iOS**: Press `i` for iOS simulator (Mac only) or scan QR code with Expo Go
   - **Web**: Press `w` for web browser

## Usage Guide

### Creating a New Session
1. Open the app (splash screen appears)
2. On main screen, tap the **+** button (bottom right)
3. Select date from date picker
4. Session is created and you're taken to attendance entry screen

### Marking Attendance - With ID
1. Leave "Forgot ID?" toggle OFF (default)
2. Enter Student/Employee ID
3. Tap "Add Attendance"
4. Entry appears in the "With ID" list below
5. Repeat for each person

### Marking Attendance - Forgot ID
1. Toggle "Forgot ID?" switch ON
2. Fill in available information (at least one field required):
   - Full Name
   - Department
   - Phone Number
3. Tap "Add Attendance"
4. Entry appears in the "Forgot ID" list below
5. Toggle back if next person has ID

### Finishing a Session
1. After marking all attendance, tap "Finish Session"
2. Confirm the total count
3. Session is saved and marked as completed
4. Returns to main screen

### Exporting Data
1. From main screen, find the session to export
2. Tap the "📊 Export" button
3. File is generated with two sheets
4. Share via your device's share menu
5. Save to Google Drive, Email, etc.

### Viewing Past Sessions
1. All sessions are shown on main screen
2. Tap any session to view/edit (if not completed)
3. Pull down to refresh the list

## App Flow

```
Splash Screen (2.5s)
    ↓
Main Screen (Sessions List)
    ↓ (Tap + button)
Date Picker
    ↓
Attendance Entry Screen
    ├→ Add ID entries
    ├→ Toggle for Forgot ID
    ├→ Add Forgot ID entries
    └→ Finish Session
        ↓
    Main Screen (Updated)
        ↓
    Export to Excel
```

## Project Structure

```
AttendanceM/
├── src/
│   ├── navigation/
│   │   └── AppNavigator.js          # Stack navigation
│   ├── screens/
│   │   ├── SplashScreen.js          # Initial splash
│   │   ├── MainScreen.js            # Sessions list + FAB
│   │   └── AttendanceEntryScreen.js # Entry form + lists
│   └── utils/
│       └── storage.js               # AsyncStorage utilities
├── App.js                           # Root component
├── babel.config.js                  # Babel configuration
└── package.json                     # Dependencies
```

## Technologies Used

- **React Native**: Mobile app framework
- **Expo**: Development platform
- **React Navigation**: Stack navigation
- **AsyncStorage**: Local data persistence
- **DateTimePicker**: Date selection
- **XLSX**: Excel file generation
- **Expo File System**: File handling
- **Expo Sharing**: Share functionality

## Data Structure

### Session Object
```javascript
{
  id: "unique_timestamp",
  date: "ISO_date_string",
  createdAt: "ISO_timestamp",
  completed: false,
  completedAt: "ISO_timestamp", // when finished
  idAttendance: [
    { id: "student_id", timestamp: "ISO_timestamp" }
  ],
  forgotIdAttendance: [
    {
      fullName: "John Doe",
      department: "CS",
      phoneNumber: "123456789",
      timestamp: "ISO_timestamp"
    }
  ]
}
```

## Storage Keys

- `@attendance_sessions`: All sessions array
- `@active_session`: Currently active session

## Key Features Explained

### Data Persistence
- All data stored locally using AsyncStorage
- Works offline - no internet required
- Data survives app restarts
- Like a note-taking app for attendance

### Session-Based System
- Each attendance session is separate
- Sessions are organized by date
- Can have multiple sessions per day
- Each session maintains its own lists

### Flexible Entry
- ID for quick entry (registered students)
- Forgot ID for detailed entry (visitors/forgot ID)
- Switch between modes instantly
- All fields optional in Forgot ID mode

### Real-Time Updates
- Lists update immediately after adding
- Statistics update in real-time
- No need to refresh manually
- Smooth user experience

## Color Scheme

- **Primary Blue**: #3b82f6 (Actions, Buttons)
- **Dark Blue**: #1e3a8a (Headers)
- **Green**: #10b981 (Add Button)
- **Red**: #ef4444 (Delete Button)
- **Background**: #f8fafc (Light gray)
- **White**: #ffffff (Cards)

## Tips

1. **Quick Entry**: For classes where students remember IDs, keep toggle OFF
2. **Mixed Entry**: Toggle ON/OFF as needed for different people
3. **Export Often**: Export sessions after completion for backup
4. **Descriptive Dates**: Select accurate dates for record-keeping
5. **Finish Sessions**: Always finish sessions to mark them as complete

## Requirements

- Node.js 14+
- npm or yarn
- Expo CLI
- iOS/Android device or emulator
- Or web browser for web version

## Support

For issues or questions, refer to:
- [Expo Documentation](https://docs.expo.dev/)
- [React Navigation Docs](https://reactnavigation.org/)

## License

MIT License
