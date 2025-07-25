import React, { useState, useEffect, useCallback } from 'react';
import { useApiWithToast } from '../../hooks/useApiWithToast';
import { 
  Users, 
  UserCheck, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  Clock,
  Search,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';

const StudentAttendanceView = ({ user }) => {
  const { callApi } = useApiWithToast();
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load classes that user has access to
  useEffect(() => {
    loadAccessibleClasses();
  }, [loadAccessibleClasses]);

  const loadAccessibleClasses = useCallback(async () => {
    try {
      setLoading(true);
      
      let endpoint = '';
      if (user?.role === 'InstituteAdmin' || user?.role === 'IT') {
        // Institute Admin can see all classes
        endpoint = '/api/classes';
      } else if (user?.role === 'Teacher') {
        // Teachers can only see classes where they are classIncharge or assigned as teachers
        endpoint = `/api/classes/teacher-access/${user.id}`;
      } else {
        // No access for other roles
        setClasses([]);
        return;
      }
      
      const response = await callApi(endpoint, 'GET');
      if (response.success) {
        const accessibleClasses = response.data || [];
        
        // Filter classes based on role responsibility
        let filteredClasses = accessibleClasses;
        if (user?.role === 'Teacher') {
          // Only show classes where user is classIncharge for student attendance
          filteredClasses = accessibleClasses.filter(cls => 
            cls.classIncharge?._id === user.id || cls.classIncharge === user.id
          );
        }
        
        setClasses(filteredClasses);
        if (filteredClasses.length > 0) {
          setSelectedClass(filteredClasses[0]);
        }
      }
    } catch (error) {
      console.error('Error loading classes:', error);
    } finally {
      setLoading(false);
    }
  }, [user, callApi]);

  // Load students for selected class
  useEffect(() => {
    if (selectedClass) {
      loadStudents();
      loadExistingAttendance();
    }
  }, [selectedClass, attendanceDate, loadStudents, loadExistingAttendance]);

  const loadStudents = useCallback(async () => {
    if (!selectedClass) return;
    
    try {
      setLoading(true);
      const response = await callApi(`/api/classes/${selectedClass._id}/students`, 'GET');
      if (response.success) {
        setStudents(response.data || []);
      }
    } catch (error) {
      console.error('Error loading students:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedClass, callApi]);

  const loadExistingAttendance = useCallback(async () => {
    if (!selectedClass) return;
    
    try {
      const response = await callApi(`/api/attendance/class/${selectedClass._id}/date/${attendanceDate}`, 'GET');
      if (response.success && response.data) {
        const attendanceMap = {};
        response.data.forEach(record => {
          attendanceMap[record.student._id] = {
            status: record.status,
            markedAt: record.markedAt,
            markedBy: record.markedBy
          };
        });
        setAttendance(attendanceMap);
      } else {
        setAttendance({});
      }
    } catch (error) {
      console.error('Error loading attendance:', error);
      setAttendance({});
    }
  }, [selectedClass, attendanceDate, callApi]);

  const markAttendance = async (studentId, status) => {
    try {
      setSaving(true);
      const response = await callApi('/api/attendance/mark', 'POST', {
        studentId,
        classId: selectedClass._id,
        date: attendanceDate,
        status,
        markedBy: user.id
      });

      if (response.success) {
        setAttendance(prev => ({
          ...prev,
          [studentId]: {
            status,
            markedAt: new Date().toISOString(),
            markedBy: user.id
          }
        }));
      }
    } catch (error) {
      console.error('Error marking attendance:', error);
    } finally {
      setSaving(false);
    }
  };

  const markAllPresent = async () => {
    try {
      setSaving(true);
      const unmarkedStudents = students.filter(student => !attendance[student._id]);
      
      for (const student of unmarkedStudents) {
        await markAttendance(student._id, 'present');
      }
    } catch (error) {
      console.error('Error marking all present:', error);
    } finally {
      setSaving(false);
    }
  };

  const getAttendanceStats = () => {
    const total = students.length;
    const marked = Object.keys(attendance).length;
    const present = Object.values(attendance).filter(a => a.status === 'present').length;
    const absent = Object.values(attendance).filter(a => a.status === 'absent').length;
    
    return { total, marked, present, absent, unmarked: total - marked };
  };

  const stats = getAttendanceStats();

  if (loading && classes.length === 0) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (classes.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Classes Assigned</h3>
        <p className="text-gray-600">
          You don't have attendance access to any classes. Contact your administrator for access.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Student Attendance</h2>
          <p className="text-sm text-gray-600">Mark and track student attendance</p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={loadExistingAttendance}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Controls Row */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Class Selection */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
            <select
              value={selectedClass?._id || ''}
              onChange={(e) => setSelectedClass(classes.find(c => c._id === e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {classes.map((cls) => (
                <option key={cls._id} value={cls._id}>
                  {cls.className} - Floor {cls.floor} ({cls.userRole})
                </option>
              ))}
            </select>
          </div>

          {/* Date Selection */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={attendanceDate}
              onChange={(e) => setAttendanceDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Quick Actions */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Quick Actions</label>
            <button
              onClick={markAllPresent}
              disabled={saving || stats.unmarked === 0}
              className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Mark All Present ({stats.unmarked})
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">Total</span>
          </div>
          <p className="text-2xl font-bold text-blue-900 mt-1">{stats.total}</p>
        </div>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-green-900">Present</span>
          </div>
          <p className="text-2xl font-bold text-green-900 mt-1">{stats.present}</p>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-600" />
            <span className="text-sm font-medium text-red-900">Absent</span>
          </div>
          <p className="text-2xl font-bold text-red-900 mt-1">{stats.absent}</p>
        </div>
        
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-600" />
            <span className="text-sm font-medium text-orange-900">Pending</span>
          </div>
          <p className="text-2xl font-bold text-orange-900 mt-1">{stats.unmarked}</p>
        </div>
      </div>

      {/* Students List */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Students ({students.length})</h3>
        </div>
        
        <div className="divide-y divide-gray-200">
          {students.map((student) => {
            const studentAttendance = attendance[student._id];
            const isMarked = !!studentAttendance;
            const isPresent = studentAttendance?.status === 'present';
            
            return (
              <div key={student._id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-700">
                        {student.name?.charAt(0)?.toUpperCase() || 'S'}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{student.name || 'Unknown Student'}</p>
                      <p className="text-sm text-gray-600">Roll: {student.rollNumber || 'N/A'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {isMarked && (
                      <span className="text-xs text-gray-500">
                        {new Date(studentAttendance.markedAt).toLocaleTimeString()}
                      </span>
                    )}
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => markAttendance(student._id, 'present')}
                        disabled={saving}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                          isPresent
                            ? 'bg-green-100 text-green-800 border border-green-200'
                            : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-green-50 hover:text-green-700'
                        }`}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </button>
                      
                      <button
                        onClick={() => markAttendance(student._id, 'absent')}
                        disabled={saving}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                          isMarked && !isPresent
                            ? 'bg-red-100 text-red-800 border border-red-200'
                            : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-red-50 hover:text-red-700'
                        }`}
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {students.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No students found for this class</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentAttendanceView;
