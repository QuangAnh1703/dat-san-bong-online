UPDATE app_user SET password_hash = '$2a$10$aJdn7BP/uK8fqcITDyLFpOfFutdQf7mnKvMTOwUdt9MP6wZncU/Lu';
SELECT id, phone, password_hash FROM app_user LIMIT 5;
