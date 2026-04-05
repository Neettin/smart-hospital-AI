import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# 1. Load the variables from your backend/.env file
load_dotenv()

# 2. Get the URL from the environment variable
# If it can't find it, it defaults to your local one (useful for testing)
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:admin%40123@localhost:5432/smart_hospital")

# 3. Create the engine
engine = create_engine(
    DATABASE_URL,
    pool_size=5,
    max_overflow=10,
    pool_timeout=30,
    pool_recycle=1800,
)

SessionLocal = sessionmaker(
    autocommit=False, 
    autoflush=False, 
    bind=engine
)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()