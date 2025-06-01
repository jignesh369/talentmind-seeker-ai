
export async function verifyStackOverflowTag(tag: string, stackOverflowKey: string): Promise<boolean> {
  try {
    const tagCheckResponse = await fetch(
      `https://api.stackexchange.com/2.3/tags/${encodeURIComponent(tag)}/info?site=stackoverflow${stackOverflowKey ? `&key=${stackOverflowKey}` : ''}`
    );

    if (!tagCheckResponse.ok) {
      console.log(`Tag ${tag} verification failed:`, tagCheckResponse.status);
      return false;
    }

    const tagData = await tagCheckResponse.json();
    if (!tagData.items || tagData.items.length === 0) {
      console.log(`Tag ${tag} does not exist, trying alternative`);
      
      // Try alternative tag formats
      const alternatives = [
        tag.replace('-', ''),
        tag.replace('-', '.'),
        tag.split('-')[0]
      ];
      
      for (const alt of alternatives) {
        const altResponse = await fetch(
          `https://api.stackexchange.com/2.3/tags/${encodeURIComponent(alt)}/info?site=stackoverflow${stackOverflowKey ? `&key=${stackOverflowKey}` : ''}`
        );
        if (altResponse.ok) {
          const altData = await altResponse.json();
          if (altData.items && altData.items.length > 0) {
            console.log(`Using alternative tag: ${alt} for ${tag}`);
            return true;
          }
        }
      }
      
      return false;
    }

    return true;
  } catch (error) {
    console.error(`Error verifying tag ${tag}:`, error);
    return false;
  }
}

export async function getTopAnswerers(tag: string, timeFrame: string, stackOverflowKey: string) {
  try {
    const topAnswerersResponse = await fetch(
      `https://api.stackexchange.com/2.3/tags/${encodeURIComponent(tag)}/top-answerers/${timeFrame}?site=stackoverflow&pagesize=30${stackOverflowKey ? `&key=${stackOverflowKey}` : ''}`
    );

    if (!topAnswerersResponse.ok) {
      console.log(`Stack Overflow API error for tag ${tag} (${timeFrame}):`, topAnswerersResponse.status);
      return null;
    }

    const topAnswerersData = await topAnswerersResponse.json();
    
    if (topAnswerersData.quota_remaining && topAnswerersData.quota_remaining < 15) {
      console.log('Stack Overflow quota getting low, conserving requests');
      return { items: [], quotaLow: true };
    }

    return {
      items: topAnswerersData.items || [],
      quotaLow: false
    };
  } catch (error) {
    console.error(`Error getting top answerers for tag ${tag}:`, error);
    return null;
  }
}

export async function getUserDetails(userId: number, stackOverflowKey: string) {
  try {
    const userResponse = await fetch(
      `https://api.stackexchange.com/2.3/users/${userId}?site=stackoverflow&filter=!*MxJLn4C3Kt3tQV${stackOverflowKey ? `&key=${stackOverflowKey}` : ''}`
    );

    if (!userResponse.ok) {
      console.log(`Failed to get user details for ${userId}`);
      return null;
    }

    const userData = await userResponse.json();
    return userData.items?.[0] || null;
  } catch (error) {
    console.error(`Error getting user details for ${userId}:`, error);
    return null;
  }
}

export async function getUserTopTags(userId: number, stackOverflowKey: string) {
  try {
    const tagsResponse = await fetch(
      `https://api.stackexchange.com/2.3/users/${userId}/top-tags?site=stackoverflow&pagesize=15${stackOverflowKey ? `&key=${stackOverflowKey}` : ''}`
    );

    if (!tagsResponse.ok) {
      return [];
    }

    const tagsData = await tagsResponse.json();
    return (tagsData.items || []).map(item => ({
      name: item.tag_name,
      score: item.answer_score,
      count: item.answer_count
    }));
  } catch (error) {
    console.error(`Error getting user tags for ${userId}:`, error);
    return [];
  }
}
