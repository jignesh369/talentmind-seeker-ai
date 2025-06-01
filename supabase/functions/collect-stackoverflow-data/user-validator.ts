
export function validateStackOverflowUser(user: any): boolean {
  // Basic validation criteria
  if (!user.user_id || !user.display_name) {
    return false
  }
  
  // Reputation threshold - should have some meaningful activity
  if ((user.reputation || 0) < 50) {
    return false
  }
  
  // Account type validation
  if (user.user_type === 'unregistered') {
    return false
  }
  
  // Profile should be somewhat complete
  if (!user.profile_image || user.profile_image.includes('identicon')) {
    return false
  }
  
  return true
}
