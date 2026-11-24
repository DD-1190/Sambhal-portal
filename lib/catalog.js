export const STAGES = [
  ['lead', 'Lead'],
  ['check', '₹999 check'],
  ['plan', 'Plan sent'],
  ['onboarding', 'Onboarding'],
  ['live', 'Live'],
];
export const stageName = (k) => (STAGES.find((s) => s[0] === k) || [k, k])[1];

export const CATALOG = [
  { id: 'property', name: 'Property enquiry flow', status: 'Ready', desc: 'Replies to every buyer enquiry on WhatsApp within seconds, asks type, budget and area, sends matching listings, books the site visit and reminds the buyer an hour before.', setup: ['Listing source (Google Sheet or the listings tab)', 'Areas and price bands', 'Site visit slots', 'Languages: Hinglish, English'], uses: ['WhatsApp', 'AI reply', 'Calendar'] },
  { id: 'pay', name: 'Payment reminders', status: 'Draft', desc: 'Reminds customers about due bills, offers a UPI payment link and sends a receipt after payment.', setup: ['Customer and dues sheet', 'UPI details', 'Reminder schedule'], uses: ['WhatsApp', 'UPI link'] },
  { id: 'quote', name: 'Quotations on WhatsApp', status: 'Planned', desc: 'Sends a quote to the customer and takes a reply to confirm the order.', setup: ['Price list', 'Quote template'], uses: ['WhatsApp', 'AI reply'] },
  { id: 'report', name: 'Daily sales report', status: 'Planned', desc: 'Sends the owner a summary of sales, new orders, pending payments and low stock.', setup: ['Sales sheet', 'Delivery time'], uses: ['WhatsApp', 'Sheets'] },
  { id: 'appt', name: 'Appointment booking', status: 'Planned', desc: 'Shows free slots, books the chosen one and sends a reminder an hour before.', setup: ['Calendar', 'Slot rules'], uses: ['WhatsApp', 'Calendar'] },
];

// Same defaults the n8n flow uses when an account has no settings of its own.
export const DEFAULT_CONFIG = {
  kinds: [{ id: 'flat', title: 'Flat kharidna hai' }, { id: 'plot', title: 'Plot kharidna hai' }, { id: 'human', title: 'Dealer se baat' }],
  budgets: [
    { id: 'b1', title: '₹30–50 lakh', min: 30, max: 50 },
    { id: 'b2', title: '₹50–80 lakh', min: 50, max: 80 },
    { id: 'b3', title: '₹80 lakh se upar', min: 80, max: 99999 },
  ],
  areas: ['Indirapuram', 'Raj Nagar Extension', 'Vaishali'],
  slots: [
    { id: 's1', title: 'Kal 11:00 AM', dayOffset: 1, time: '11:00' },
    { id: 's2', title: 'Kal 4:00 PM', dayOffset: 1, time: '16:00' },
    { id: 's3', title: 'Parso 11:00 AM', dayOffset: 2, time: '11:00' },
  ],
  rates: { ai_call: 0.3, template: 0.35, session_message: 0 },
  greeting: 'Namaste! Main {name} ka assistant hoon. Aap kya dhundh rahe hain?',
};
