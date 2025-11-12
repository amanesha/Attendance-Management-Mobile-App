import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAllUploads, deleteUpload, clearAllUploads, addUpload, getAllEmployees } from '../utils/storage';
import * as DocumentPicker from 'expo-document-picker';
import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system/legacy';

const EmployeeManagementScreen = ({ navigation }) => {
  const [uploads, setUploads] = useState([]);
  const [selectedUpload, setSelectedUpload] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [departmentData, setDepartmentData] = useState([]);

  useEffect(() => {
    loadUploads();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadUploads();
    });
    return unsubscribe;
  }, [navigation]);

  const loadUploads = async () => {
    const allUploads = await getAllUploads();
    setUploads(allUploads.reverse()); // Most recent first
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleUploadExcel = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel'
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const fileUri = result.assets[0].uri;
      const fileName = result.assets[0].name;
      const fileContent = await FileSystem.readAsStringAsync(fileUri, {
        encoding: 'base64',
      });

      // Parse Excel file
      const workbook = XLSX.read(fileContent, { type: 'base64' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      // Transform data
      const newEmployees = jsonData.map((row) => ({
        id: String(row.ID || row.id || '').trim(),
        nameAmharic: String(row.NameAmharic || row['Name Amharic'] || '').trim(),
        fullName: String(row['Full Name'] || row.FullName || row.Name || '').trim(),
        phoneNumber: String(row.Phone || row.PhoneNumber || row['Phone Number'] || '').trim(),
        department: String(row.Department || row.Dept || '').trim(),
      })).filter(emp => emp.id || emp.phoneNumber);

      if (newEmployees.length === 0) {
        Alert.alert('Error', 'No valid data found in Excel file.');
        return;
      }

      // Check for duplicates
      const existingEmployees = await getAllEmployees();
      const duplicates = newEmployees.filter(newEmp =>
        existingEmployees.some(existingEmp =>
          (newEmp.id && existingEmp.id === newEmp.id) ||
          (newEmp.phoneNumber && existingEmp.phoneNumber === newEmp.phoneNumber)
        )
      );

      if (duplicates.length > 0) {
        Alert.alert(
          'Duplicates Found',
          `${duplicates.length} employee(s) already exist (matching ID or phone).\n\nOptions:\n1. Skip duplicates and add only new records\n2. Delete all existing data and upload fresh`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Skip Duplicates',
              onPress: async () => {
                const uniqueEmployees = newEmployees.filter(newEmp =>
                  !existingEmployees.some(existingEmp =>
                    (newEmp.id && existingEmp.id === newEmp.id) ||
                    (newEmp.phoneNumber && existingEmp.phoneNumber === newEmp.phoneNumber)
                  )
                );
                if (uniqueEmployees.length > 0) {
                  await addUpload(uniqueEmployees, fileName);
                  loadUploads();
                  Alert.alert('Success', `${uniqueEmployees.length} new employees added.`);
                } else {
                  Alert.alert('Info', 'All records were duplicates. Nothing added.');
                }
              },
            },
            {
              text: 'Replace All',
              style: 'destructive',
              onPress: () => {
                Alert.alert(
                  'Confirm',
                  'This will delete ALL existing employee data and upload fresh. Continue?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Yes, Replace All',
                      style: 'destructive',
                      onPress: async () => {
                        await clearAllUploads();
                        await addUpload(newEmployees, fileName);
                        loadUploads();
                        Alert.alert('Success', `Replaced with ${newEmployees.length} employees.`);
                      },
                    },
                  ]
                );
              },
            },
          ]
        );
      } else {
        // No duplicates, add directly
        await addUpload(newEmployees, fileName);
        loadUploads();
        Alert.alert('Success', `${newEmployees.length} employees imported successfully!`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Error', error.message || 'Failed to import file. Please try again.');
    }
  };

  const handleDeleteUpload = (upload) => {
    Alert.alert(
      'Delete Upload',
      `Delete "${upload.fileName}"?\n\nThis will remove ${upload.employeeCount} employees from the database.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const success = await deleteUpload(upload.id);
            if (success) {
              loadUploads();
              Alert.alert('Success', 'Upload deleted successfully');
            } else {
              Alert.alert('Error', 'Failed to delete upload');
            }
          },
        },
      ]
    );
  };

  const handleViewUpload = (upload) => {
    // Group employees by department
    const grouped = {};
    upload.employees.forEach(emp => {
      const dept = emp.department || 'Unknown';
      if (!grouped[dept]) {
        grouped[dept] = [];
      }
      grouped[dept].push(emp);
    });

    // Convert to array and sort by department name
    const deptArray = Object.entries(grouped).map(([department, employees]) => ({
      department,
      employees,
      count: employees.length,
    })).sort((a, b) => a.department.localeCompare(b.department));

    setDepartmentData(deptArray);
    setSelectedUpload(upload);
    setShowDetailModal(true);
  };

  const renderUpload = ({ item }) => (
    <View style={styles.uploadCard}>
      <View style={styles.uploadHeader}>
        <View style={styles.uploadIcon}>
          <Text style={styles.uploadIconText}>📂</Text>
        </View>
        <View style={styles.uploadInfo}>
          <Text style={styles.uploadFileName}>{item.fileName}</Text>
          <Text style={styles.uploadDate}>{formatDate(item.uploadDate)}</Text>
          <Text style={styles.uploadCount}>{item.employeeCount} employees</Text>
        </View>
      </View>
      <View style={styles.uploadActions}>
        <TouchableOpacity
          style={styles.viewButton}
          onPress={() => handleViewUpload(item)}
        >
          <Text style={styles.viewButtonText}>👁 View</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteUpload(item)}
        >
          <Text style={styles.deleteButtonText}>🗑 Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderDepartment = ({ item }) => (
    <View style={styles.departmentCard}>
      <View style={styles.departmentHeader}>
        <Text style={styles.departmentName}>{item.department}</Text>
        <Text style={styles.departmentCount}>{item.count} employees</Text>
      </View>
      <View style={styles.employeesList}>
        {item.employees.map((emp, index) => (
          <View key={index} style={styles.employeeItem}>
            <Text style={styles.employeeId}>ID: {emp.id || 'N/A'}</Text>
            <Text style={styles.employeeName}>{emp.fullName}</Text>
            {emp.phoneNumber && (
              <Text style={styles.employeePhone}>📞 {emp.phoneNumber}</Text>
            )}
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Database Management</Text>
          <Text style={styles.headerSubtitle}>የመረጃ ቋት አስተዳደር</Text>
        </View>

        <View style={styles.uploadButtonContainer}>
          <TouchableOpacity
            style={styles.uploadNewButton}
            onPress={handleUploadExcel}
          >
            <Text style={styles.uploadNewButtonText}>📤 Upload New Excel</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsBar}>
          <Text style={styles.statsText}>
            {uploads.length} {uploads.length === 1 ? 'upload' : 'uploads'}
          </Text>
        </View>

        <FlatList
          data={uploads}
          renderItem={renderUpload}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📂</Text>
              <Text style={styles.emptyText}>No database uploaded yet</Text>
              <Text style={styles.emptySubtext}>Upload an Excel file to get started</Text>
            </View>
          }
        />

        {/* Detail Modal */}
        <Modal
          visible={showDetailModal}
          transparent={false}
          animationType="slide"
          onRequestClose={() => setShowDetailModal(false)}
        >
          <SafeAreaView style={styles.modalSafeArea} edges={['top', 'bottom']}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <TouchableOpacity
                  onPress={() => setShowDetailModal(false)}
                  style={styles.modalBackButton}
                >
                  <Text style={styles.modalBackButtonText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>{selectedUpload?.fileName}</Text>
                <Text style={styles.modalSubtitle}>
                  {selectedUpload?.employeeCount} employees in {departmentData.length} departments
                </Text>
              </View>

              <FlatList
                data={departmentData}
                renderItem={renderDepartment}
                keyExtractor={(item, index) => index.toString()}
                contentContainerStyle={styles.modalListContent}
              />
            </View>
          </SafeAreaView>
        </Modal>
      </View>
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
  header: {
    backgroundColor: '#1e3a8a',
    paddingTop: 20,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  backButton: {
    marginBottom: 10,
  },
  backButtonText: {
    color: '#93c5fd',
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#93c5fd',
  },
  uploadButtonContainer: {
    padding: 16,
  },
  uploadNewButton: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  uploadNewButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statsBar: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  statsText: {
    fontSize: 14,
    color: '#64748b',
  },
  listContent: {
    padding: 16,
  },
  uploadCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  uploadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  uploadIcon: {
    width: 50,
    height: 50,
    backgroundColor: '#dbeafe',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  uploadIconText: {
    fontSize: 24,
  },
  uploadInfo: {
    flex: 1,
  },
  uploadFileName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  uploadDate: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 2,
  },
  uploadCount: {
    fontSize: 13,
    color: '#3b82f6',
    fontWeight: '600',
  },
  uploadActions: {
    flexDirection: 'row',
    gap: 8,
  },
  viewButton: {
    flex: 1,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  viewButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748b',
  },
  // Modal Styles
  modalSafeArea: {
    flex: 1,
    backgroundColor: '#1e3a8a',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  modalHeader: {
    backgroundColor: '#1e3a8a',
    paddingTop: 20,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  modalBackButton: {
    marginBottom: 10,
  },
  modalBackButtonText: {
    color: '#93c5fd',
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#93c5fd',
  },
  modalListContent: {
    padding: 16,
  },
  departmentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  departmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#e2e8f0',
  },
  departmentName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  departmentCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  employeesList: {
    gap: 8,
  },
  employeeItem: {
    padding: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
  },
  employeeId: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3b82f6',
    marginBottom: 4,
  },
  employeeName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  employeePhone: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
});

export default EmployeeManagementScreen;
