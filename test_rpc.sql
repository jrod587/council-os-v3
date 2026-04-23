-- Test script for grant_purchased_credits
-- Replace the UUID with the actual auth_user_id of your test user
select public.grant_purchased_credits(
  p_auth_user_id := 'ENTER_TEST_USER_UUID_HERE',
  p_email := 'test1@example.com',
  p_checkout_session_id := 'cs_test_fake_session_123',
  p_payment_intent_id := 'pi_test_fake_intent_123',
  p_stripe_customer_id := 'cus_test_fake_123',
  p_amount_total := 700,
  p_currency := 'usd',
  p_credits := 1,
  p_metadata := '{"auth_user_id": "ENTER_TEST_USER_UUID_HERE"}'::jsonb
);

-- Then verify if the credits updated:
select * from public.user_accounts where auth_user_id = 'ENTER_TEST_USER_UUID_HERE';
select * from public.credit_ledger order by created_at desc limit 5;
