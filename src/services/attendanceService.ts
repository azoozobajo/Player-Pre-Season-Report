import { supabase } from '../lib/supabase'
import { type AttendanceSession, type AttendanceRecord, type AttendanceStatus } from '../types'

export const attendanceService = {
  async getAttendanceSessions(programId: string): Promise<AttendanceSession[]> {
    const { data, error } = await supabase
      .from('attendance_sessions')
      .select('*')
      .eq('program_id', programId)
      .order('session_date', { ascending: false })
    if (error) throw error
    return data || []
  },

  async createAttendanceSession(sessionData: Omit<AttendanceSession, 'id' | 'user_id' | 'created_at'>): Promise<AttendanceSession> {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('attendance_sessions')
      .insert({ ...sessionData, user_id: user?.id })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async updateAttendanceSession(id: string, updates: Partial<AttendanceSession>): Promise<AttendanceSession> {
    const { data, error } = await supabase
      .from('attendance_sessions')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async deleteAttendanceSession(id: string): Promise<void> {
    const { error } = await supabase.from('attendance_sessions').delete().eq('id', id)
    if (error) throw error
  },

  async getAttendanceRecords(sessionId: string): Promise<AttendanceRecord[]> {
    const { data, error } = await supabase
      .from('attendance_records')
      .select('*, player:players(*)')
      .eq('attendance_session_id', sessionId)
    if (error) throw error
    return data || []
  },

  async saveAttendanceRecord(recordData: Omit<AttendanceRecord, 'id' | 'created_at' | 'player'>): Promise<AttendanceRecord> {
    const { data, error } = await supabase
      .from('attendance_records')
      .upsert(recordData, { onConflict: 'attendance_session_id,player_id' })
      .select('*, player:players(*)')
      .single()
    if (error) throw error
    return data
  },

  async updateAttendanceRecord(id: string, status: AttendanceStatus, notes?: string): Promise<AttendanceRecord> {
    const { data, error } = await supabase
      .from('attendance_records')
      .update({ status, notes })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async getPlayerAttendanceSummary(playerId: string, programId: string) {
    const { data: sessions } = await supabase
      .from('attendance_sessions')
      .select('id')
      .eq('program_id', programId)

    if (!sessions || sessions.length === 0) {
      return { total: 0, present: 0, absent: 0, late: 0, excused: 0, percentage: 0 }
    }

    const sessionIds = sessions.map(s => s.id)
    const { data: records } = await supabase
      .from('attendance_records')
      .select('status')
      .eq('player_id', playerId)
      .in('attendance_session_id', sessionIds)

    const records2 = records || []
    const total = records2.length
    const present = records2.filter(r => r.status === 'present').length
    const absent  = records2.filter(r => r.status === 'absent').length
    const late    = records2.filter(r => r.status === 'late').length

    // late counts as attended
    const attended = present + late

    return {
      total,
      present,
      absent,
      late,
      excused: 0,
      attended,
      percentage: total > 0 ? Math.round((attended / total) * 100) : 0,
    }
  },
}
