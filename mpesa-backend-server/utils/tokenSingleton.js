const axios = require('axios');

class TokenSingleton {
  constructor() {
    this.token = null;
    this.expiryTime = null;
    this.isFetching = false;
    this.fetchPromise = null;
  }

  async getToken() {
    const now = Date.now();
    // Buffer of 1 minute (60000ms) before actual expiration
    if (this.token && this.expiryTime && now < this.expiryTime - 60000) {
      return this.token;
    }

    if (this.isFetching) {
      return this.fetchPromise;
    }

    this.isFetching = true;
    this.fetchPromise = this._fetchNewToken().finally(() => {
      this.isFetching = false;
      this.fetchPromise = null;
    });

    return this.fetchPromise;
  }

  async _fetchNewToken() {
    try {
      const consumerKey = process.env.MPESA_CONSUMER_KEY;
      const consumerSecret = process.env.MPESA_CONSUMER_SECRET;

      if (!consumerKey || !consumerSecret) {
        throw new Error('M-Pesa Consumer Key or Secret is missing from environment variables');
      }
      
      const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
      
      const response = await axios.get('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
        headers: {
          Authorization: `Basic ${auth}`
        }
      });
      
      this.token = response.data.access_token;
      // expires_in is usually 3599 seconds
      this.expiryTime = Date.now() + (response.data.expires_in * 1000);
      
      return this.token;
    } catch (error) {
      console.error('Error fetching M-Pesa token:', error.response?.data || error.message);
      throw new Error('Failed to fetch M-Pesa token');
    }
  }
}

module.exports = new TokenSingleton();
