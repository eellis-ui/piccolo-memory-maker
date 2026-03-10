

## Plan: Simplify Affiliate Signup Form

### Changes

**1. Remove social media fields from the signup form (`src/pages/BecomeAffiliate.tsx`)**
- Remove the Instagram and TikTok input fields and their state variables from the affiliate details form (lines 253-271, state on lines 54-55)
- Keep the form to just: Full Name + Discount Code

**2. Update bottom CTA to scroll to the hero form**
- Replace the `<Link to="/affiliates">` button in the bottom CTA section (lines 373-377) with an anchor scroll or `scrollIntoView` that takes the user up to the hero signup form instead of navigating away

