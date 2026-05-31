CREATE TABLE users (
    id uuid NOT NULL,
    email varchar(255) NOT NULL,
    first_name varchar(255) NOT NULL,
    last_name varchar(255) NOT NULL,
    branch_of_service varchar(50) NOT NULL,
    zip_code varchar(5),
    password_hash varchar(255) NOT NULL,
    created_at timestamp(6) NOT NULL,
    updated_at timestamp(6) NOT NULL,
    CONSTRAINT pk_users PRIMARY KEY (id),
    CONSTRAINT uq_users_email UNIQUE (email)
);

CREATE TABLE saved_resources (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    external_id varchar(255) NOT NULL,
    source_api varchar(50) NOT NULL,
    resource_name varchar(255) NOT NULL,
    description text,
    category varchar(30) NOT NULL,
    phone varchar(20),
    website varchar(255),
    address varchar(255),
    city varchar(100),
    state varchar(2),
    zip_code varchar(10),
    notes text,
    saved_at timestamp(6) NOT NULL,
    updated_at timestamp(6) NOT NULL,
    CONSTRAINT pk_saved_resources PRIMARY KEY (id),
    CONSTRAINT fk_saved_resources_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT uq_saved_resource_user_external UNIQUE (user_id, external_id, source_api)
);

CREATE INDEX idx_saved_resources_user_id ON saved_resources (user_id);
