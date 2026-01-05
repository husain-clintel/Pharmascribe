import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';
const TEST_REPORT_ID = 'test-report-' + Date.now();

test.describe('Agent Memory API', () => {
  test('should store and recall memories', async ({ request }) => {
    // Store a decision memory
    const storeResponse = await request.post(`${BASE_URL}/api/agent/memory`, {
      data: {
        reportId: TEST_REPORT_ID,
        memoryType: 'DECISION',
        content: {
          decision: 'Use distributed for IV route',
          section: 'executive-summary',
          context: 'User preferred distributed over infused'
        },
        importance: 9,
        category: 'terminology'
      }
    });

    expect(storeResponse.ok()).toBeTruthy();
    const storeData = await storeResponse.json();
    console.log('Store response:', storeData);
    expect(storeData.success).toBe(true);
    expect(storeData.memory.reportId).toBe(TEST_REPORT_ID);
    expect(storeData.memory.memoryType).toBe('DECISION');

    // Store a fact memory
    const storeFactResponse = await request.post(`${BASE_URL}/api/agent/memory`, {
      data: {
        reportId: TEST_REPORT_ID,
        memoryType: 'FACT',
        content: {
          species: 'rat',
          doses: [1, 3, 10],
          route: 'IV',
          duration: '28 days'
        },
        importance: 10,
        category: 'study_design'
      }
    });

    expect(storeFactResponse.ok()).toBeTruthy();
    const factData = await storeFactResponse.json();
    console.log('Store fact response:', factData);

    // Recall all memories for the report
    const recallResponse = await request.get(
      `${BASE_URL}/api/agent/memory?reportId=${TEST_REPORT_ID}`
    );

    expect(recallResponse.ok()).toBeTruthy();
    const recallData = await recallResponse.json();
    console.log('Recall response:', recallData);
    expect(recallData.success).toBe(true);
    expect(recallData.count).toBe(2);

    // Recall with filters
    const filteredResponse = await request.get(
      `${BASE_URL}/api/agent/memory?reportId=${TEST_REPORT_ID}&types=DECISION&minImportance=8`
    );

    expect(filteredResponse.ok()).toBeTruthy();
    const filteredData = await filteredResponse.json();
    console.log('Filtered recall:', filteredData);
    expect(filteredData.count).toBe(1);
    expect(filteredData.memories[0].memoryType).toBe('DECISION');

    // Cleanup - delete all memories for test report
    const deleteResponse = await request.delete(
      `${BASE_URL}/api/agent/memory?reportId=${TEST_REPORT_ID}`
    );

    expect(deleteResponse.ok()).toBeTruthy();
    const deleteData = await deleteResponse.json();
    console.log('Delete response:', deleteData);
    expect(deleteData.success).toBe(true);

    // Verify deletion
    const verifyResponse = await request.get(
      `${BASE_URL}/api/agent/memory?reportId=${TEST_REPORT_ID}`
    );
    const verifyData = await verifyResponse.json();
    console.log('Verify deletion:', verifyData);
    expect(verifyData.count).toBe(0);
  });
});
