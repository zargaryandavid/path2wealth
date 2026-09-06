// All onboarding questions live here, one per screen.
// To add/remove/reorder a question, just edit this list.
//   type: 'chips'  -> tap-to-pick options (an option may carry an icon key)
//         'wheel'  -> iOS-style spinning wheel picker
//         'text'   -> free typing
//         'money'  -> dollar amount (auto-formats with commas)
export const STEPS = [
  { key: 'age',       label: 'Age',                 question: "What's your age?",              subtitle: 'This helps us tailor your plan.', type: 'chips', options: ['18–24', '25–34', '35–44', '45–54', '55+'] },
  { key: 'gender',    label: 'Gender',              question: 'How do you identify?',          subtitle: null, type: 'chips', options: [
      { icon: 'male', label: 'Male' }, { icon: 'female', label: 'Female' },
      { icon: 'nonbinary', label: 'Non-binary' }, { icon: 'notsay', label: 'Prefer not to say' } ] },
  { key: 'income',    label: 'Net monthly income',  question: "What's your net monthly income?", subtitle: 'Take-home pay after tax. You can change this anytime.', type: 'money' },
  { key: 'location',  label: 'Location',            question: 'Where are you based?',          subtitle: null, type: 'text',  placeholder: 'City, Country' },
  { key: 'specialty', label: 'Profession',          question: 'What do you do?',               subtitle: 'Scroll to your field or profession.', type: 'wheel', options: ['Technology', 'Healthcare', 'Finance', 'Design & Creative', 'Education', 'Business / Founder', 'Engineering', 'Sales & Marketing', 'Legal', 'Trades', 'Student', 'Other'] },
  { key: 'goal',      label: 'Money goal',          question: "What's your main money goal?",  subtitle: null, type: 'chips', options: ['Save more', 'Invest', 'Pay off debt', 'Reach FIRE', 'Just track spending'] },
];
