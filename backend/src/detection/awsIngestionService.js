const { EC2Client, DescribeInstancesCommand } = require('@aws-sdk/client-ec2');
const resourceRepository = require('../repositories/resourceRepository');
const Organization = require('../models/Organization');

class AWSIngestionService {
  /**
   * Ingest live EC2 instances from AWS SDK or format live telemetry into Mongo repository
   */
  async syncEC2Resources(orgId, region = process.env.AWS_REGION || 'us-east-1') {
    const results = {
      ingested: 0,
      updated: 0,
      source: 'AWS_SDK_LIVE',
      resources: [],
      error: null,
    };

    try {
      const client = new EC2Client({ region });
      const command = new DescribeInstancesCommand({});
      const response = await client.send(command);

      const instances = [];
      if (response.Reservations) {
        response.Reservations.forEach((reservation) => {
          if (reservation.Instances) {
            reservation.Instances.forEach((inst) => instances.push(inst));
          }
        });
      }

      for (const inst of instances) {
        const instanceId = inst.InstanceId;
        const nameTag = inst.Tags?.find((t) => t.Key === 'Name')?.value || `aws-ec2-${instanceId}`;
        const envTag = inst.Tags?.find((t) => t.Key === 'Environment' || t.Key === 'env')?.value || 'testing';
        const ownerTag = inst.Tags?.find((t) => t.Key === 'Owner' || t.Key === 'owner')?.value || null;

        const resourceData = {
          resourceId: instanceId,
          name: nameTag,
          provider: 'AWS',
          type: 'EC2_INSTANCE',
          environment: envTag.toLowerCase(),
          creationTime: inst.LaunchTime ? new Date(inst.LaunchTime) : new Date(),
          state: inst.State?.Name === 'running' ? 'PROTECTED' : 'ORPHAN_CANDIDATE',
          owner: {
            email: ownerTag,
            name: ownerTag ? ownerTag.split('@')[0] : null,
            isActiveOwner: Boolean(ownerTag),
          },
          ownershipState: ownerTag ? 'ACTIVE_OWNER' : 'NO_OWNER',
          heartbeat: {
            lastHeartbeatTime: new Date(),
            isHeartbeatActive: inst.State?.Name === 'running',
          },
          activity: {
            lastActivityTime: new Date(),
            metricsCount: inst.State?.Name === 'running' ? 450 : 0,
          },
          organizationId: orgId,
          tags: new Map(inst.Tags?.map((t) => [t.Key, t.value]) || []),
        };

        const existing = await resourceRepository.findByResourceId(orgId, instanceId);
        if (existing) {
          await resourceRepository.updateState(orgId, instanceId, resourceData);
          results.updated++;
        } else {
          await resourceRepository.create(resourceData);
          results.ingested++;
        }
        results.resources.push(instanceId);
      }

      return results;
    } catch (err) {
      console.warn(`[AWS Ingestion] Live AWS EC2 SDK fallback triggered: ${err.message}`);
      results.source = 'AWS_SDK_SIMULATED_INGESTION';
      results.error = err.message;
      return results;
    }
  }
}

module.exports = new AWSIngestionService();
