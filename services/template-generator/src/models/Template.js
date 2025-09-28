const mongoose = require('mongoose');

const templateSchema = new mongoose.Schema({
  id: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true,
    lowercase: true
  },
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  description: { 
    type: String, 
    required: true,
    trim: true
  },
  category: { 
    type: String, 
    required: true,
    enum: ['media', 'web-server', 'downloads', 'database', 'monitoring', 'security', 'development', 'other'],
    lowercase: true
  },
  version: { 
    type: String, 
    default: '1.0.0',
    trim: true
  },
  tags: [{
    type: String,
    lowercase: true,
    trim: true
  }],
  metadata: {
    defaultPorts: [{
      type: Number,
      min: 1,
      max: 65535
    }],
    requiredVolumes: [{
      type: String,
      trim: true
    }],
    officialImage: {
      type: String,
      trim: true
    }
  },
  variables: [{
    name: { 
      type: String, 
      required: true,
      trim: true
    },
    type: { 
      type: String, 
      enum: ['string', 'number', 'boolean'], 
      default: 'string' 
    },
    description: {
      type: String,
      trim: true
    },
    defaultValue: mongoose.Schema.Types.Mixed,
    required: { 
      type: Boolean, 
      default: false 
    }
  }],
  services: { 
    type: mongoose.Schema.Types.Mixed, 
    required: true
  },
  networks: { 
    type: mongoose.Schema.Types.Mixed, 
    default: {} 
  },
  volumes: { 
    type: mongoose.Schema.Types.Mixed, 
    default: {} 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  usage: {
    downloadCount: {
      type: Number,
      default: 0,
      min: 0
    },
    lastUsed: {
      type: Date,
      default: Date.now
    }
  }
}, { 
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.__v;
      return ret;
    }
  }
});

// Add indexes for performance
templateSchema.index({ category: 1 });
templateSchema.index({ isActive: 1 });
templateSchema.index({ tags: 1 });

// Static methods
templateSchema.statics.findByCategory = function(category) {
  return this.find({ category, isActive: true }).sort({ name: 1 });
};

templateSchema.statics.findPopular = function(limit = 10) {
  return this.find({ isActive: true })
    .sort({ 'usage.downloadCount': -1 })
    .limit(limit);
};

templateSchema.statics.searchByName = function(searchTerm) {
  return this.find({
    isActive: true,
    $or: [
      { name: { $regex: searchTerm, $options: 'i' } },
      { description: { $regex: searchTerm, $options: 'i' } },
      { tags: { $in: [new RegExp(searchTerm, 'i')] } }
    ]
  }).sort({ name: 1 });
};

// Instance methods
templateSchema.methods.incrementUsage = function() {
  this.usage.downloadCount += 1;
  this.usage.lastUsed = new Date();
  return this.save();
};

const Template = mongoose.model('Template', templateSchema);
module.exports = Template;