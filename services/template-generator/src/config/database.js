const mongoose = require('mongoose');

class Database {
  constructor() {
    this.isConnected = false;
    this.connectionUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017/template-generator';
    this.setupEventListeners();
  }

  async connect() {
    try {
      await mongoose.connect(this.connectionUrl, {
        serverSelectionTimeoutMS: 5000,
        maxPoolSize: 10
      });
      console.log('✅ MongoDB connected');
      this.isConnected = true;
      return true;
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error.message);
      this.isConnected = false;
      throw error;
    }
  }

  async disconnect() {
    try {
      await mongoose.disconnect();
      console.log('🔌 MongoDB disconnected');
      this.isConnected = false;
    } catch (error) {
      console.error('❌ Error disconnecting from MongoDB:', error.message);
    }
  }

  setupEventListeners() {
    mongoose.connection.on('connected', () => {
      console.log('🔗 Mongoose connected to MongoDB');
      this.isConnected = true;
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ Mongoose connection error:', err.message);
      this.isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.log('🔌 Mongoose disconnected from MongoDB');
      this.isConnected = false;
    });
  }

  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      name: mongoose.connection.name,
      url: this.connectionUrl
    };
  }

  async healthCheck() {
    try {
      if (!this.isConnected) {
        return { status: 'disconnected', message: 'Not connected to database' };
      }

      await mongoose.connection.db.admin().ping();
      
      return {
        status: 'connected',
        message: 'Database connection is healthy',
        details: this.getConnectionStatus()
      };
    } catch (error) {
      return {
        status: 'error',
        message: error.message,
        details: this.getConnectionStatus()
      };
    }
  }
}

const database = new Database();
module.exports = database;