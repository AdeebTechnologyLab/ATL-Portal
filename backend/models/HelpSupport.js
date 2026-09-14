const mongoose = require('mongoose');

const faqItemSchema = new mongoose.Schema({
    id: { type: String, required: true },
    q: { type: String, required: true },
    a: { type: String, required: true },
    links: [{ type: { type: String }, href: { type: String }, label: { type: String } }]
}, { _id: false });

const faqSectionSchema = new mongoose.Schema({
    id: { type: String, required: true },
    title: { type: String, required: true },
    titleEn: { type: String, required: true },
    items: [faqItemSchema]
}, { _id: false });

const highlightSchema = new mongoose.Schema({
    label: { type: String, required: true },
    value: { type: String, required: true },
    sub: { type: String, required: true }
}, { _id: false });

const helpSupportSchema = new mongoose.Schema({
    highlights: [highlightSchema],
    sections: [faqSectionSchema],
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('HelpSupport', helpSupportSchema);
