import { supabase } from '../lib/supabase'

export const storageService = {
  async uploadPlayerPhoto(userId: string, playerId: string, file: File): Promise<string> {
    const ext = file.name.split('.').pop()
    const path = `${userId}/players/${playerId}.${ext}`
    const { error } = await supabase.storage.from('photos').upload(path, file, { upsert: true })
    if (error) throw error
    return path
  },

  async uploadProgramLogo(userId: string, programId: string, file: File): Promise<string> {
    const ext = file.name.split('.').pop()
    const path = `${userId}/programs/${programId}.${ext}`
    const { error } = await supabase.storage.from('photos').upload(path, file, { upsert: true })
    if (error) throw error
    return path
  },

  async uploadReportPdf(userId: string, programId: string, playerId: string, file: File): Promise<string> {
    const path = `${userId}/reports/${programId}/${playerId}_${Date.now()}.pdf`
    const { error } = await supabase.storage.from('reports').upload(path, file, { upsert: true })
    if (error) throw error
    return path
  },

  getPublicUrl(bucket: string, path: string): string {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path)
    return data.publicUrl
  },

  async getSignedUrl(bucket: string, path: string): Promise<string> {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600)
    if (error) throw error
    return data.signedUrl
  },
}
