-- Create demo instructor accounts if they don't exist
INSERT INTO users (name, email, password, role, instructor_name)
VALUES 
    ('Test Instructor', 'test@capstone.com', '$2a$10$wq0cC9V6GgvETD7D7D7D7eXKx0TkD8F7.YmZ1x0xF5x0xF5x0xF5x', 'instructor', 'Test Instructor'),
    ('Srijan', 'srijan@capstone.com', '$2a$10$wq0cC9V6GgvETD7D7D7D7eXKx0TkD8F7.YmZ1x0xF5x0xF5x0xF5x', 'instructor', 'Srijan'),
    ('Saurav', 'saurav@capstone.com', '$2a$10$wq0cC9V6GgvETD7D7D7D7eXKx0TkD8F7.YmZ1x0xF5x0xF5x0xF5x', 'instructor', 'Saurav'),
    ('Jami', 'jami@capstone.com', '$2a$10$wq0cC9V6GgvETD7D7D7D7eXKx0TkD8F7.YmZ1x0xF5x0xF5x0xF5x', 'instructor', 'Jami'),
    ('Mai', 'mai@capstone.com', '$2a$10$wq0cC9V6GgvETD7D7D7D7eXKx0TkD8F7.YmZ1x0xF5x0xF5x0xF5x', 'instructor', 'Mai'),
    ('Tamkeen', 'tamkeen@capstone.com', '$2a$10$wq0cC9V6GgvETD7D7D7D7eXKx0TkD8F7.YmZ1x0xF5x0xF5x0xF5x', 'instructor', 'Tamkeen'),
    ('Naveen', 'naveen@capstone.com', '$2a$10$wq0cC9V6GgvETD7D7D7D7eXKx0TkD8F7.YmZ1x0xF5x0xF5x0xF5x', 'instructor', 'Naveen'),
    ('Gabi', 'gabi@capstone.com', '$2a$10$wq0cC9V6GgvETD7D7D7D7eXKx0TkD8F7.YmZ1x0xF5x0xF5x0xF5x', 'instructor', 'Gabi')
ON CONFLICT (email) DO NOTHING;