const Property = require("../models/property.model");
const {
  ConflictError,
  NotFoundError,
  ForbiddenError,
} = require("../utils/errors");

// GET /api/properties/saved
const getSavedProperties = async (req, res, next) => {
  try {
    // Only return properties that belong to the requesting user.
    // req.user._id is set by the auth middleware.
    const properties = await Property.find({ owner: req.user._id });
    res.json(properties);
  } catch (err) {
    return next(err);
  }
};

// POST /api/properties/saved
const saveProperty = async (req, res, next) => {
  try {
    const {
      listingId,
      title,
      prefecture,
      city,
      price,
      imageUrl,
      bedrooms,
      sqMeters,
      yearBuilt,
      description,
      tags,
    } = req.body;

    const property = await Property.create({
      listingId,
      title,
      prefecture,
      city,
      price,
      imageUrl,
      bedrooms,
      sqMeters,
      yearBuilt,
      description,
      tags,
      owner: req.user._id,
    });

    res.status(201).json(property);
  } catch (err) {
    if (err.code === 11000)
      return next(new ConflictError("Property already saved"));
    return next(err);
  }
};

// DELETE /api/properties/saved/:id
const unsaveProperty = async (req, res, next) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return next(new NotFoundError("Property not found"));

    // Ownership check: only the user who saved it can remove it.
    if (property.owner.toString() !== req.user._id.toString()) {
      return next(
        new ForbiddenError("You can only remove your own saved properties"),
      );
    }

    await property.deleteOne();
    res.json({ message: "Property removed" });
  } catch (err) {
    return next(err);
  }
};

module.exports = { getSavedProperties, saveProperty, unsaveProperty };
