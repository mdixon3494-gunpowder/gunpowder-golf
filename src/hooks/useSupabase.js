import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Generic hook for fetching data from Supabase
 */
export function useSupabaseQuery(table, options = {}) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const { select = '*', filter, orderBy, limit } = options

  useEffect(() => {
    fetchData()
  }, [table, JSON.stringify(options)])

  async function fetchData() {
    try {
      setLoading(true)
      let query = supabase.from(table).select(select)

      if (filter) {
        Object.entries(filter).forEach(([key, value]) => {
          query = query.eq(key, value)
        })
      }

      if (orderBy) {
        query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true })
      }

      if (limit) {
        query = query.limit(limit)
      }

      const { data, error } = await query

      if (error) throw error
      setData(data || [])
    } catch (err) {
      setError(err.message)
      console.error(`Error fetching ${table}:`, err)
    } finally {
      setLoading(false)
    }
  }

  return { data, loading, error, refetch: fetchData }
}

/**
 * Hook for real-time subscriptions
 */
export function useSupabaseRealtime(table, callback) {
  useEffect(() => {
    const subscription = supabase
      .channel(`${table}_changes`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, callback)
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [table, callback])
}

/**
 * Hook for mutations (insert, update, delete)
 */
export function useSupabaseMutation(table) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function insert(data) {
    setLoading(true)
    setError(null)
    try {
      const { data: result, error } = await supabase.from(table).insert(data).select()
      if (error) throw error
      return result
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  async function update(id, data) {
    setLoading(true)
    setError(null)
    try {
      const { data: result, error } = await supabase.from(table).update(data).eq('id', id).select()
      if (error) throw error
      return result
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  async function remove(id) {
    setLoading(true)
    setError(null)
    try {
      const { error } = await supabase.from(table).delete().eq('id', id)
      if (error) throw error
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { insert, update, remove, loading, error }
}
