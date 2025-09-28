/**
 * Consistent date formatting utility to prevent hydration mismatches
 * Always returns the same format on both server and client
 */

export function formatDate(dateString: string | null | undefined, format: 'short' | 'full' = 'short'): string {
  if (!dateString) return 'Unknown';
  
  try {
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    
    if (format === 'short') {
      // Format: DD/MM/YYYY (consistent across server/client)
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } else {
      // Format: DD Mon YYYY (e.g., "26 Sep 2024")
      const day = date.getDate().toString().padStart(2, '0');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[date.getMonth()];
      const year = date.getFullYear();
      return `${day} ${month} ${year}`;
    }
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
}

export function formatLastSync(dateString: string | null | undefined): string {
  if (!dateString) return 'Never';
  return formatDate(dateString, 'short');
}

export function formatJoinedDate(dateString: string | null | undefined): string {
  if (!dateString) return 'Unknown';
  return formatDate(dateString, 'full');
}
