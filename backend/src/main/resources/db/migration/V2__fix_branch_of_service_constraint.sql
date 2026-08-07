ALTER TABLE users DROP CONSTRAINT IF EXISTS users_branch_of_service_check;

UPDATE users
SET branch_of_service = 'MARINE_CORPS'
WHERE branch_of_service = 'MARINES';

ALTER TABLE users
ADD CONSTRAINT users_branch_of_service_check
CHECK (branch_of_service IN (
    'ARMY',
    'NAVY',
    'AIR_FORCE',
    'MARINE_CORPS',
    'COAST_GUARD',
    'SPACE_FORCE'
));
