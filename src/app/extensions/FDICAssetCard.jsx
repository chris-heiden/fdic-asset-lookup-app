import React, { useState, useEffect } from 'react';
import {
  Divider,
  Text,
  Button,
  Alert,
  Flex,
  LoadingSpinner,
  hubspot
} from '@hubspot/ui-extensions';

// Define the extension to be run within the CRM
hubspot.extend(({ context, runServerlessFunction, actions }) => (
  <Extension
    context={context}
    runServerlessFunction={runServerlessFunction}
    actions={actions}
  />
));

// The main extension component
const Extension = ({ context, runServerlessFunction, actions }) => {
  const [loading, setLoading] = useState(false);
  const [assetData, setAssetData] = useState(null);
  const [error, setError] = useState(null);
  const [lastQueried, setLastQueried] = useState(null);

  // Get the current company's RSSD ID
  const rssdId = context.crm.objectProperties.rssd_id;
  const currentAssetSize = context.crm.objectProperties.asset_size_revation_;

  // Function to get asset size from FDIC
  const getAssetSize = async () => {
    if (!rssdId) {
      setError('RSSD ID is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Call serverless function to get FDIC data
      const result = await runServerlessFunction({
        name: 'getFDICAssetSize',
        parameters: { rssdId: rssdId }
      });

      if (result.response.success) {
        const { assetSize, cert, queryDate } = result.response.data;
        
        setAssetData({
          assetSize,
          cert,
          queryDate
        });
        setLastQueried(new Date().toLocaleString());

        // Update the company record with the asset size
        await actions.updateCrmObjectProperties([
          {
            name: 'asset_size_revation_',
            value: assetSize.toString()
          }
        ]);

      } else {
        setError(result.response.message || 'Failed to retrieve asset data');
      }
    } catch (err) {
      setError('Error fetching asset size data');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Text format={{ fontWeight: 'bold' }}>
        FDIC Asset Size Lookup
      </Text>
      
      <Divider />
      
      {rssdId && (
        <Text>
          <Text format={{ fontWeight: 'medium' }}>RSSD ID:</Text> {rssdId}
        </Text>
      )}
      
      {currentAssetSize && (
        <Text>
          <Text format={{ fontWeight: 'medium' }}>Current Asset Size:</Text> ${parseInt(currentAssetSize).toLocaleString()}
        </Text>
      )}

      <Flex direction="row" align="center" gap="small">
        <Button
          type="primary"
          onClick={getAssetSize}
          disabled={loading || !rssdId}
        >
          {loading ? 'Getting Asset Size...' : 'Get Asset Size'}
        </Button>
        {loading && <LoadingSpinner size="xs" />}
      </Flex>

      {error && (
        <Alert title="Error" variant="error">
          {error}
        </Alert>
      )}

      {assetData && (
        <Alert title="Asset Size Retrieved" variant="success">
          <Text>
            <Text format={{ fontWeight: 'medium' }}>CERT:</Text> {assetData.cert}
          </Text>
          <Text>
            <Text format={{ fontWeight: 'medium' }}>Asset Size:</Text> ${parseInt(assetData.assetSize).toLocaleString()}
          </Text>
          <Text>
            <Text format={{ fontWeight: 'medium' }}>Query Date:</Text> {assetData.queryDate}
          </Text>
        </Alert>
      )}

      {lastQueried && (
        <Text format={{ fontSize: 'small' }}>
          Last queried: {lastQueried}
        </Text>
      )}
    </>
  );
};

export default Extension;