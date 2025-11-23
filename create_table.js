#!/usr/bin/env node
"use strict";
// create_table.js
// Usage: set DATABASE_URL in .env (Postgres connection), then:
//   npm install
//   node create_table.js

const fs = require('fs');
const path = require('path');
require('dotenv').config();

const { Client } = require('pg');

const sqlPath = path.join(__dirname, 'create_tasks_table.sql');
if(!process.env.DATABASE_URL){
  console.error('DATABASE_URL not found in environment.');
  console.error('If you want this script to run, add DATABASE_URL to your .env (Postgres connection string).');
  console.error('Alternatively, run the SQL directly in Supabase SQL editor (see create_tasks_table.sql).');
  process.exit(1);
}

async function main(){
  const sql = fs.readFileSync(sqlPath, 'utf8');
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try{
    await client.connect();
    console.log('Connected to database. Executing SQL...');
    await client.query(sql);
    console.log('SQL executed successfully. Table should be created.');
  }catch(err){
    console.error('Error executing SQL:', err.message || err);
  }finally{
    await client.end();
  }
}

main();
