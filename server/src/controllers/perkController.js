import Joi from 'joi';
import { Perk } from '../models/Perk.js';

// Create a base schema
const perkSchema = Joi.object({
  // Make title optional by removing .required()
  title: Joi.string().min(2),
  description: Joi.string().allow(''),
  category: Joi.string().valid('food','tech','travel','fitness','other').default('other'),
  discountPercent: Joi.number().min(0).max(100).default(0),
  merchant: Joi.string().allow('')
}); 

// Create a separate schema for creating new perks (where title is required)
const createPerkSchema = perkSchema.fork('title', schema => schema.required());
  

// Filter perks by exact title match if title query parameter is provided 
export async function filterPerks(req, res, next) {
  try {
    const { title } = req.query     ;
    if (title) {
      const perks = await Perk.find ({ title: title}).sort({ createdAt: -1 });
      console.log(perks);
      res.status(200).json(perks)
    }
    else {
      res.status(400).json({ message: 'Title query parameter is required' });
    }
  } catch (err) { next(err); }
}


// Get a single perk by ID 
export async function getPerk(req, res, next) {
  try {
    const perk = await Perk.findById(req.params.id);
    console.log(perk);
    if (!perk) return res.status(404).json({ message: 'Perk not found' });
    res.json({ perk });
    // next() is used to pass errors to the error handling middleware
  } catch (err) { next(err); }
}

// get all perks
export async function getAllPerks(req, res, next) {
  try {
    const perks = await Perk.find().sort({ createdAt: -1 });
    res.json(perks);
  } catch (err) { next(err); }
}

// Create a new perk
export async function createPerk(req, res, next) {
  try {
    const { value, error } = createPerkSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.message });
     // ...value spreads the validated fields
    const doc = await Perk.create({ ...value});
    res.status(201).json({ perk: doc });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'Duplicate perk for this merchant' });
    next(err);
  }
}
// TODO
// Update an existing perk by ID and validate only the fields that are being updated 
export async function updatePerk(req, res, next) {
  try {
    // First check if perk exists
    const existingPerk = await Perk.findById(req.params.id);
    if (!existingPerk) {
      return res.status(404).json({ message: 'Perk not found' });
    }

    // Only validate the fields that are provided in the request
    const { value, error } = perkSchema.validate(req.body, { 
      stripUnknown: true,
      allowUnknown: false,
      presence: 'optional'
    });
    
    if (error) return res.status(400).json({ message: error.message });

    // Create an update object only with fields that were provided
    const updates = {};
    Object.entries(req.body).forEach(([key, val]) => {
      if (val !== undefined) {
        updates[key] = val;
      }
    });

    // Update using $set to only modify provided fields
    const updatedPerk = await Perk.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { 
        new: true, 
        runValidators: true,
        omitUndefined: true  // Prevents undefined values from being saved
      }
    );

    res.json({ perk: updatedPerk });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Duplicate perk for this merchant' });
    }
    next(err);
  }
}


// Delete a perk by ID
export async function deletePerk(req, res, next) {
  try {
    const doc = await Perk.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Perk not found' });
    res.json({ ok: true });
  } catch (err) { next(err); }
}
