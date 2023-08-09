import {
  AthenaClient,
  GetQueryExecutionCommand,
  GetQueryResultsCommand,
  StartQueryExecutionCommand,
  QueryExecutionState,
} from '@aws-sdk/client-athena';

import {
  DATABASE_NAME,
  TABLE_NAME,
  S3_URL_FOR_OUTPUT_LOCATION,
  S3_URL_FOR_QUERY,
  QUERY_DATE
} from '../constants';
const athena = new AthenaClient();

export const buildQuery = async (): Promise<string> => {
  // Update query if needed 
  const query = `
  SELECT
    COUNT(DISTINCT user_id) AS total_new_users
  FROM
    "${TABLE_NAME}"
  WHERE
    "$PATH" = '${S3_URL_FOR_QUERY}'
    AND date_submission = CAST('${QUERY_DATE}' AS DATE)
    AND user_id NOT IN (
      SELECT
        DISTINCT user_id
      FROM
        "${TABLE_NAME}"
      WHERE
        "$PATH" = '${S3_URL_FOR_QUERY}'
        AND date_submission < CAST('${QUERY_DATE}' AS DATE)
    )
  LIMIT
    1;
  `;
  console.log(`query: ${JSON.stringify(query)}`);
  return query;
};

export const getQueryResultFromAthena = async (query: string): Promise<any> => {
  const queryExecutionId = await executeQuery(query);
  await waitExecuteQuery(queryExecutionId);
  const resultSet = getQueryResults(queryExecutionId);
  return resultSet;
};

const executeQuery = async (query: string): Promise<string> => {
  const { QueryExecutionId } = await athena.send(
    new StartQueryExecutionCommand({
      QueryString: query,
      QueryExecutionContext: {
        Database: DATABASE_NAME,
      },
      ResultConfiguration: {
        OutputLocation: S3_URL_FOR_OUTPUT_LOCATION,
      },
    }),
  );

  if (QueryExecutionId === undefined)
    throw new Error('QueryExecutionId is undefined.');

  return QueryExecutionId;
};

const waitExecuteQuery = async (queryExecutionId: string) => {
  // Poll the result until the execution finishs
  let queryExecutionState: QueryExecutionState = QueryExecutionState.RUNNING;
  while (queryExecutionState === QueryExecutionState.RUNNING) {
    console.log(`Polling query execution...`)
    // wait for 1 second
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Check quert execution status
    const { QueryExecution } = await athena.send(
      new GetQueryExecutionCommand({
        QueryExecutionId: queryExecutionId,
      }),
    );
    if (QueryExecution?.Status?.State === undefined) {
      throw new Error('QueryExecution is undefined.');
    }

    // Store query execution status
    queryExecutionState = QueryExecution.Status.State as QueryExecutionState;
  }

  if (queryExecutionState !== QueryExecutionState.SUCCEEDED) {
    throw new Error(
      `Query ${queryExecutionId} failed with status ${queryExecutionState}`,
    );
  }
};

const getQueryResults = async (queryExecutionId: string): Promise<any> => {
  const { ResultSet } = await athena.send(
    new GetQueryResultsCommand({
      QueryExecutionId: queryExecutionId,
    }),
  );

  if (ResultSet?.Rows === undefined) {
    throw new Error('ResultSet is undefined.');
  }
  console.log(`ResultSet: ${JSON.stringify(ResultSet)}`);
  return ResultSet;
};
