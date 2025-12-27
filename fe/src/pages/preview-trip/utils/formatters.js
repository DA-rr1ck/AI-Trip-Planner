export const formatBudget = (min, max) => {
    return `$${min?.toLocaleString() || 0} - $${max?.toLocaleString() || 0}`
  }
  
  export const formatTravelers = (adults, children) => {
    const parts = []
    if (adults > 0) parts.push(`${adults} ${adults === 1 ? 'Adult' : 'Adults'}`)
    if (children > 0) parts.push(`${children} ${children === 1 ? 'Child' : 'Children'}`)
    return parts.join(', ') || '0 Travelers'
  }