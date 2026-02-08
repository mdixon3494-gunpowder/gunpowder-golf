import { supabase } from './supabase'

/**
 * Format template operations
 */

export async function getAllTemplates() {
  const { data, error } = await supabase
    .from('format_templates')
    .select('*')
    .order('is_default', { ascending: false })
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching templates:', error)
    return []
  }
  return data || []
}

export async function getDefaultTemplate() {
  const { data, error } = await supabase
    .from('format_templates')
    .select('*')
    .eq('is_default', true)
    .single()

  if (error) {
    console.error('Error fetching default template:', error)
    return null
  }
  return data
}

export async function getTemplateById(id) {
  const { data, error } = await supabase
    .from('format_templates')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching template:', error)
    return null
  }
  return data
}
