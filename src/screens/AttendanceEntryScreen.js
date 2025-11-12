import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  getActiveSession,
  addIdAttendance,
  addForgotIdAttendance,
  completeSession,
  deleteIdAttendance,
  deleteForgotIdAttendance,
  updateIdAttendance,
  updateForgotIdAttendance,
  getEmployeeById,
  getEmployeeByPhone,
  getAllEmployees,
} from '../utils/storage';

const AttendanceEntryScreen = ({ navigation }) => {
  const [session, setSession] = useState(null);
  const [forgotId, setForgotId] = useState(false);
  const [id, setId] = useState('');
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [editingIdIndex, setEditingIdIndex] = useState(null);
  const [editingIdValue, setEditingIdValue] = useState('');
  const [editingForgotIdIndex, setEditingForgotIdIndex] = useState(null);
  const [editingForgotIdData, setEditingForgotIdData] = useState({
    fullName: '',
    department: '',
    phoneNumber: '',
  });
  const [idSuggestions, setIdSuggestions] = useState([]);
  const [phoneSuggestions, setPhoneSuggestions] = useState([]);
  const [employeeMap, setEmployeeMap] = useState({});

  useEffect(() => {
    loadSession();
    loadEmployees();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadEmployees();
    }, [])
  );

  const loadEmployees = async () => {
    const employees = await getAllEmployees();
    const map = {};
    employees.forEach(emp => {
      if (emp.id) {
        map[emp.id] = emp;
      }
    });
    setEmployeeMap(map);
  };

  const loadSession = async () => {
    const activeSession = await getActiveSession();
    if (activeSession) {
      setSession(activeSession);
    } else {
      Alert.alert('Error', 'No active session found', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    }
  };

  const handleIdChange = async (text) => {
    setId(text);

    // Search for matching IDs and phone numbers
    if (text.trim().length > 0) {
      const employees = await getAllEmployees();
      const matches = employees.filter(emp =>
        (emp.id && emp.id.toLowerCase().includes(text.trim().toLowerCase())) ||
        (emp.phoneNumber && emp.phoneNumber.includes(text.trim()))
      ).slice(0, 5); // Limit to 5 suggestions
      setIdSuggestions(matches);
    } else {
      setIdSuggestions([]);
    }
  };

  const handleSelectIdSuggestion = async (employee) => {
    setIdSuggestions([]);
    // Directly add attendance with the employee's ID to avoid async state issues
    const success = await addIdAttendance(employee.id);
    if (success) {
      setId('');
      await loadSession();
      await loadEmployees();
    } else {
      Alert.alert('Error', 'Failed to add attendance');
    }
  };

  const handlePhoneChange = async (text) => {
    setPhoneNumber(text);

    // Search for matching phone numbers
    if (text.trim().length >= 3) {
      const employees = await getAllEmployees();
      const matches = employees.filter(emp =>
        emp.phoneNumber && emp.phoneNumber.includes(text.trim())
      ).slice(0, 5); // Limit to 5 suggestions
      setPhoneSuggestions(matches);
    } else {
      setPhoneSuggestions([]);
    }
  };

  const handleSelectPhoneSuggestion = (employee) => {
    setPhoneNumber(employee.phoneNumber);
    setFullName(employee.fullName);
    setDepartment(employee.department);
    setPhoneSuggestions([]);
  };

  const handleAddAttendance = async () => {
    if (forgotId) {
      // Check if at least one field is filled
      if (!fullName.trim() && !department.trim() && !phoneNumber.trim()) {
        Alert.alert('Error', 'Please fill at least one field');
        return;
      }

      const success = await addForgotIdAttendance({
        fullName: fullName.trim(),
        department: department.trim(),
        phoneNumber: phoneNumber.trim(),
      });

      if (success) {
        setFullName('');
        setDepartment('');
        setPhoneNumber('');
        setPhoneSuggestions([]);
        await loadSession();
        await loadEmployees();
      } else {
        Alert.alert('Error', 'Failed to add attendance');
      }
    } else {
      if (!id.trim()) {
        Alert.alert('Error', 'Please enter an ID');
        return;
      }

      const success = await addIdAttendance(id.trim());

      if (success) {
        setId('');
        setIdSuggestions([]);
        await loadSession();
        await loadEmployees();
      } else {
        Alert.alert('Error', 'Failed to add attendance');
      }
    }
  };

  const handleFinish = async () => {
    const totalCount =
      (session?.idAttendance?.length || 0) +
      (session?.forgotIdAttendance?.length || 0);

    if (totalCount === 0) {
      Alert.alert(
        'No Attendance',
        'No attendance has been recorded yet. Do you still want to finish?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Finish Anyway',
            onPress: async () => {
              await completeSession();
              navigation.goBack();
            },
          },
        ]
      );
      return;
    }

    Alert.alert(
      'Finish Session',
      `Complete this session with ${totalCount} total attendance records?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Finish',
          onPress: async () => {
            const success = await completeSession();
            if (success) {
              Alert.alert('Success', 'Session completed successfully!', [
                { text: 'OK', onPress: () => navigation.goBack() },
              ]);
            } else {
              Alert.alert('Error', 'Failed to complete session');
            }
          },
        },
      ]
    );
  };

  const handleDeleteId = (index) => {
    Alert.alert(
      'Delete Attendance',
      'Are you sure you want to delete this ID attendance?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const success = await deleteIdAttendance(index);
            if (success) {
              await loadSession();
            } else {
              Alert.alert('Error', 'Failed to delete attendance');
            }
          },
        },
      ]
    );
  };

  const handleEditId = (index, currentId) => {
    setEditingIdIndex(index);
    setEditingIdValue(currentId);
  };

  const handleSaveId = async (index) => {
    if (!editingIdValue || !editingIdValue.trim()) {
      Alert.alert('Error', 'ID cannot be empty');
      return;
    }
    const success = await updateIdAttendance(index, editingIdValue.trim());
    if (success) {
      setEditingIdIndex(null);
      setEditingIdValue('');
      await loadSession();
    } else {
      Alert.alert('Error', 'Failed to update attendance');
    }
  };

  const handleCancelEdit = () => {
    setEditingIdIndex(null);
    setEditingIdValue('');
  };

  const handleDeleteForgotId = (index) => {
    Alert.alert(
      'Delete Attendance',
      'Are you sure you want to delete this attendance?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const success = await deleteForgotIdAttendance(index);
            if (success) {
              await loadSession();
            } else {
              Alert.alert('Error', 'Failed to delete attendance');
            }
          },
        },
      ]
    );
  };

  const handleEditForgotId = (index, item) => {
    setEditingForgotIdIndex(index);
    setEditingForgotIdData({
      fullName: item.fullName || '',
      department: item.department || '',
      phoneNumber: item.phoneNumber || '',
    });
  };

  const handleSaveForgotId = async (index) => {
    // Check if at least one field is filled
    if (!editingForgotIdData.fullName.trim() &&
        !editingForgotIdData.department.trim() &&
        !editingForgotIdData.phoneNumber.trim()) {
      Alert.alert('Error', 'Please fill at least one field');
      return;
    }
    const success = await updateForgotIdAttendance(index, editingForgotIdData);
    if (success) {
      setEditingForgotIdIndex(null);
      setEditingForgotIdData({ fullName: '', department: '', phoneNumber: '' });
      await loadSession();
    } else {
      Alert.alert('Error', 'Failed to update attendance');
    }
  };

  const handleCancelEditForgotId = () => {
    setEditingForgotIdIndex(null);
    setEditingForgotIdData({ fullName: '', department: '', phoneNumber: '' });
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!session) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
      <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.headerTitle}>Mark Attendance</Text>
              <Text style={styles.headerDate}>
                {new Date(session.date).toLocaleDateString()}
              </Text>
            </View>
            <View style={styles.headerStats}>
              <Text style={styles.totalNumber}>
                {session.idAttendance.length + session.forgotIdAttendance.length}
              </Text>
              <Text style={styles.totalLabel}>Present</Text>
            </View>
          </View>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.toggleContainer}>
            <View style={styles.toggleTextContainer}>
              <Text style={styles.toggleLabel}>Student/Employee Forgot ID?</Text>
              <Text style={styles.toggleHint}>Switch to manual entry</Text>
            </View>
            <Switch
              value={forgotId}
              onValueChange={setForgotId}
              trackColor={{ false: '#cbd5e1', true: '#93c5fd' }}
              thumbColor={forgotId ? '#3b82f6' : '#f1f5f9'}
            />
          </View>

          {!forgotId ? (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Student/Employee ID or Phone</Text>
              <Text style={styles.labelHint}>Type ID or phone number to search</Text>
              <TextInput
                style={styles.input}
                value={id}
                onChangeText={handleIdChange}
                placeholder="Enter ID or Phone Number"
                placeholderTextColor="#94a3b8"
                returnKeyType="done"
                onSubmitEditing={handleAddAttendance}
              />
              {idSuggestions.length > 0 && (
                <ScrollView
                  style={styles.suggestionsContainer}
                  nestedScrollEnabled={true}
                  keyboardShouldPersistTaps="handled"
                >
                  {idSuggestions.map((employee, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.suggestionItem}
                      onPress={() => handleSelectIdSuggestion(employee)}
                    >
                      <View style={styles.suggestionLeft}>
                        <Text style={styles.suggestionId}>ID: {employee.id}</Text>
                        <Text style={styles.suggestionName}>{employee.fullName}</Text>
                        <Text style={styles.suggestionDept}>{employee.department}</Text>
                        {employee.phoneNumber && (
                          <Text style={styles.suggestionPhone}>Phone: {employee.phoneNumber}</Text>
                        )}
                      </View>
                      <Text style={styles.suggestionArrow}>→</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          ) : (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Full Name <Text style={styles.optional}>(Optional)</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Enter full name"
                  placeholderTextColor="#94a3b8"
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Department <Text style={styles.optional}>(Optional)</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  value={department}
                  onChangeText={setDepartment}
                  placeholder="Enter department"
                  placeholderTextColor="#94a3b8"
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Phone Number <Text style={styles.optional}>(Optional)</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  value={phoneNumber}
                  onChangeText={handlePhoneChange}
                  placeholder="Enter phone number"
                  placeholderTextColor="#94a3b8"
                  keyboardType="phone-pad"
                />
                {phoneSuggestions.length > 0 && (
                  <ScrollView
                    style={styles.suggestionsContainer}
                    nestedScrollEnabled={true}
                    keyboardShouldPersistTaps="handled"
                  >
                    {phoneSuggestions.map((employee, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.suggestionItem}
                        onPress={() => handleSelectPhoneSuggestion(employee)}
                      >
                        <View style={styles.suggestionLeft}>
                          <Text style={styles.suggestionId}>{employee.phoneNumber}</Text>
                          <Text style={styles.suggestionName}>{employee.fullName}</Text>
                          <Text style={styles.suggestionDept}>{employee.department}</Text>
                        </View>
                        <Text style={styles.suggestionArrow}>→</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>
            </>
          )}

          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAddAttendance}
          >
            <Text style={styles.addButtonIcon}>✓</Text>
            <Text style={styles.addButtonText}>Mark Present</Text>
          </TouchableOpacity>
        </View>

        {/* ID Attendance List */}
        {session.idAttendance.length > 0 && (
          <View style={styles.listSection}>
            <Text style={styles.listTitle}>
              ✓ Marked Present - With ID ({session.idAttendance.length})
            </Text>
            {session.idAttendance.map((item, index) => (
              <View key={index} style={styles.listItem}>
                {editingIdIndex === index ? (
                  <View style={styles.editingRow}>
                    <View style={styles.editInputContainer}>
                      <Text style={styles.listItemNumber}>{index + 1}</Text>
                      <TextInput
                        style={styles.editInput}
                        value={editingIdValue}
                        onChangeText={setEditingIdValue}
                        keyboardType="numeric"
                        autoFocus
                        placeholder="Enter ID"
                        placeholderTextColor="#94a3b8"
                      />
                    </View>
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={styles.saveButton}
                        onPress={() => handleSaveId(index)}
                      >
                        <Text style={styles.saveButtonText}>✓</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={handleCancelEdit}
                      >
                        <Text style={styles.cancelButtonText}>×</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={styles.listItemRow}>
                    <View style={styles.listItemLeft}>
                      <Text style={styles.listItemNumber}>{index + 1}</Text>
                      <View style={styles.attendanceDetails}>
                        <Text style={styles.listItemId}>ID: {item.id}</Text>
                        {employeeMap[item.id] ? (
                          <>
                            <Text style={styles.listItemName}>{employeeMap[item.id].fullName}</Text>
                            <Text style={styles.listItemDetail}>{employeeMap[item.id].department}</Text>
                          </>
                        ) : (
                          <Text style={styles.listItemNotFound}>Not in database</Text>
                        )}
                        <Text style={styles.listItemTime}>{formatTime(item.timestamp)}</Text>
                      </View>
                    </View>
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => handleEditId(index, item.id)}
                      >
                        <Text style={styles.editButtonText}>✎</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => handleDeleteId(index)}
                      >
                        <Text style={styles.deleteButtonText}>×</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Forgot ID Attendance List */}
        {session.forgotIdAttendance.length > 0 && (
          <View style={styles.listSection}>
            <Text style={styles.listTitle}>
              ✓ Marked Present - No ID ({session.forgotIdAttendance.length})
            </Text>
            {session.forgotIdAttendance.map((item, index) => (
              <View key={index} style={styles.listItem}>
                {editingForgotIdIndex === index ? (
                  <View style={styles.editingForgotIdContainer}>
                    <View style={styles.editingForgotIdHeader}>
                      <Text style={styles.listItemNumber}>{index + 1}</Text>
                      <View style={styles.editingForgotIdActions}>
                        <TouchableOpacity
                          style={styles.saveButton}
                          onPress={() => handleSaveForgotId(index)}
                        >
                          <Text style={styles.saveButtonText}>✓</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.cancelButton}
                          onPress={handleCancelEditForgotId}
                        >
                          <Text style={styles.cancelButtonText}>×</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={styles.editingForgotIdFields}>
                      <TextInput
                        style={styles.editForgotIdInput}
                        value={editingForgotIdData.fullName}
                        onChangeText={(text) => setEditingForgotIdData({...editingForgotIdData, fullName: text})}
                        placeholder="Full Name"
                        placeholderTextColor="#94a3b8"
                        autoCapitalize="words"
                      />
                      <TextInput
                        style={styles.editForgotIdInput}
                        value={editingForgotIdData.department}
                        onChangeText={(text) => setEditingForgotIdData({...editingForgotIdData, department: text})}
                        placeholder="Department"
                        placeholderTextColor="#94a3b8"
                        autoCapitalize="words"
                      />
                      <TextInput
                        style={styles.editForgotIdInput}
                        value={editingForgotIdData.phoneNumber}
                        onChangeText={(text) => setEditingForgotIdData({...editingForgotIdData, phoneNumber: text})}
                        placeholder="Phone Number"
                        placeholderTextColor="#94a3b8"
                        keyboardType="phone-pad"
                      />
                    </View>
                  </View>
                ) : (
                  <View style={styles.listItemContent}>
                    <View style={styles.listItemLeft}>
                      <Text style={styles.listItemNumber}>{index + 1}</Text>
                      <View style={styles.forgotIdInfo}>
                        {item.fullName && (
                          <Text style={styles.listItemName}>{item.fullName}</Text>
                        )}
                        {item.department && (
                          <Text style={styles.listItemDetail}>{item.department}</Text>
                        )}
                        {item.phoneNumber && (
                          <Text style={styles.listItemDetail}>{item.phoneNumber}</Text>
                        )}
                        <Text style={styles.listItemTimeSmall}>{formatTime(item.timestamp)}</Text>
                      </View>
                    </View>
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => handleEditForgotId(index, item)}
                      >
                        <Text style={styles.editButtonText}>✎</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => handleDeleteForgotId(index)}
                      >
                        <Text style={styles.deleteButtonText}>×</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        <View style={styles.actionContainer}>
          <TouchableOpacity style={styles.finishButton} onPress={handleFinish}>
            <Text style={styles.finishButtonIcon}>✓</Text>
            <Text style={styles.finishButtonText}>Complete Session</Text>
          </TouchableOpacity>
          <Text style={styles.finishHint}>
            Completing will save and close this session
          </Text>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1e3a8a',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 100,
    fontSize: 18,
    color: '#64748b',
  },
  header: {
    backgroundColor: '#1e3a8a',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 2,
  },
  headerDate: {
    fontSize: 12,
    color: '#93c5fd',
  },
  headerStats: {
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  totalNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  totalLabel: {
    fontSize: 11,
    color: '#dbeafe',
  },
  formContainer: {
    backgroundColor: '#ffffff',
    margin: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 20,
    paddingTop: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  toggleTextContainer: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  toggleHint: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  labelHint: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  optional: {
    fontSize: 12,
    fontWeight: 'normal',
    color: '#64748b',
  },
  input: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    color: '#1e293b',
  },
  suggestionsContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    maxHeight: 200,
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  suggestionLeft: {
    flex: 1,
  },
  suggestionId: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
    marginBottom: 2,
  },
  suggestionName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  suggestionDept: {
    fontSize: 13,
    color: '#64748b',
  },
  suggestionPhone: {
    fontSize: 12,
    color: '#10b981',
    marginTop: 2,
  },
  suggestionArrow: {
    fontSize: 20,
    color: '#3b82f6',
    marginLeft: 8,
  },
  addButton: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonIcon: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    marginRight: 8,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  listSection: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
  },
  listItem: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  listItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  listItemLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  listItemNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#3b82f6',
    marginRight: 12,
    minWidth: 24,
  },
  attendanceDetails: {
    flex: 1,
  },
  listItemId: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
    marginBottom: 4,
  },
  listItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  listItemDetail: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  listItemNotFound: {
    fontSize: 12,
    color: '#f59e0b',
    fontStyle: 'italic',
    marginTop: 2,
  },
  listItemTime: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 4,
  },
  listItemTimeSmall: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 4,
  },
  forgotIdInfo: {
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 8,
  },
  editButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 6,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: '#ef4444',
    borderRadius: 6,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    lineHeight: 24,
  },
  editingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  editInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  editInput: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 6,
    padding: 8,
    fontSize: 16,
    borderWidth: 2,
    borderColor: '#3b82f6',
    color: '#1e293b',
  },
  saveButton: {
    backgroundColor: '#10b981',
    borderRadius: 6,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#94a3b8',
    borderRadius: 6,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    lineHeight: 24,
  },
  editingForgotIdContainer: {
    width: '100%',
  },
  editingForgotIdHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  editingForgotIdActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editingForgotIdFields: {
    gap: 8,
  },
  editForgotIdInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 6,
    padding: 10,
    fontSize: 14,
    borderWidth: 2,
    borderColor: '#3b82f6',
    color: '#1e293b',
  },
  actionContainer: {
    padding: 16,
  },
  finishButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  finishButtonIcon: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: 'bold',
    marginRight: 8,
  },
  finishButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  finishHint: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  bottomPadding: {
    height: 40,
  },
});

export default AttendanceEntryScreen;
