const axios = require('axios');

const baseUrl = 'http://localhost:3000';

async function testValidUser() {
  const testUserId = '1'; // Valid user ID from users.csv
  try {
    const response = await axios.get(`${baseUrl}/api/ride/${testUserId}`);
    console.log('Test Valid User:');
    console.log('API Response Status:', response.status);
    console.log('API Response Data:', response.data);
    if (response.status === 200) {
      console.log('Test passed: Ride API is working correctly for valid user.');
    } else {
      console.error('Test failed: Unexpected response status for valid user.');
    }
  } catch (error) {
    console.error('Test failed: Error fetching ride for valid user.', error.message);
  }
}

async function testInvalidUser() {
  const invalidUserId = '9999'; // Non-existent user ID
  try {
    await axios.get(`${baseUrl}/api/ride/${invalidUserId}`);
    console.error('Test failed: Expected 404 for invalid user but got success.');
  } catch (error) {
    if (error.response && error.response.status === 404) {
      console.log('Test passed: Correctly handled invalid user with 404.');
    } else {
      console.error('Test failed: Unexpected error for invalid user.', error.message);
    }
  }
}

async function testNoAvailableDrivers() {
  const testUserId = '1';
  try {
    await axios.get(`${baseUrl}/api/ride/${testUserId}?testNoDrivers=true`);
    console.error('Test failed: Expected 404 for no available drivers but got success.');
  } catch (error) {
    if (error.response && error.response.status === 404) {
      console.log('Test passed: Correctly handled no available drivers with 404.');
    } else {
      console.error('Test failed: Unexpected error for no available drivers.', error.message);
    }
  }
}

async function testNoRouteFound() {
  const testUserId = '1';
  try {
    await axios.get(`${baseUrl}/api/ride/${testUserId}?testNoRoute=true`);
    console.error('Test failed: Expected 500 for no route found but got success.');
  } catch (error) {
    if (error.response && error.response.status === 500) {
      console.log('Test passed: Correctly handled no route found with 500.');
    } else {
      console.error('Test failed: Unexpected error for no route found.', error.message);
    }
  }
}

async function runTests() {
  await testValidUser();
  await testInvalidUser();
  await testNoAvailableDrivers();
  await testNoRouteFound();
}

runTests();
