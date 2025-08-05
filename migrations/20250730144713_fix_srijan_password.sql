-- Fix Srijan's password to match the expected value
UPDATE users 
SET password = '$2b$10$UbJs/I5iRmx0ETBpi4bXEO4Pk0WG6wBKj4v1dou5iE.HXS7S9qTsu'
WHERE email = 'srijan@capstone.com';