import * as cdk from '@aws-cdk/core';
import * as iam from '@aws-cdk/aws-iam'
import * as s3 from '@aws-cdk/aws-s3'
import * as ec2 from '@aws-cdk/aws-ec2'
import * as kms from '@aws-cdk/aws-kms'

import {
    IAspect,
} from '@aws-cdk/core';

export class ChangePublicSubnet implements IAspect {
    visit(node: cdk.IConstruct): void {
        if (node instanceof ec2.CfnSubnet && node.mapPublicIpOnLaunch) {
            node.addPropertyOverride('MapPublicIpOnLaunch', false)
        }
    }
}

export class AddCfnNag implements IAspect {
    visit(node: cdk.IConstruct): void {

        if (node.node.path in ['QCStack-main/Custom::S3AutoDeleteObjectsCustomResourceProvider/Handler']) {
            (node as cdk.CfnResource).addMetadata('cfn_nag', {
                rules_to_suppress: [{
                        id: 'W58',
                        reason: 'the lambda is auto generated by CDK',
                    },
                    {
                        id: 'W89',
                        reason: 'the lambda is auto generated by CDK',
                    },
                    {
                        id: 'W92',
                        reason: 'the lambda is auto generated by CDK',
                    }
                ],
            });
        } else if (node.node.path in ['QCStack-main/QCLifeScienceBatch/AggResultLambda/Resource']) {
            (node as cdk.CfnResource).addMetadata('cfn_nag', {
                rules_to_suppress: [{
                    id: 'W58',
                    reason: 'the lambda already have the permission',
                }, ],
            });
        } else if (node.node.path in [
                'QCStack-main/QCLifeScienceBatch/jobRole/DefaultPolicy/Resource',
                'QCStack-main/QCLifeScienceBatch/executionRole/DefaultPolicy/Resource',
                'QCStack-main/QCLifeScienceBatch/AggResultLambdaRole/DefaultPolicy/Resource'
            ]) {
            (node as cdk.CfnResource).addMetadata('cfn_nag', {
                rules_to_suppress: [{
                    id: 'W12',
                    reason: 'need access the rescoures',
                }, ],
            });
        } else if (node instanceof s3.CfnBucket) {
            node.addMetadata('cfn_nag', {
                rules_to_suppress: [{
                    id: 'W35',
                    reason: 'S3 bucket access logging will be configured manually',
                }, ],
            });
        } else if (node instanceof ec2.CfnSecurityGroup) {
            node.addMetadata('cfn_nag', {
                rules_to_suppress: [{
                    id: 'W5',
                    reason: 'need internet access',
                }, ],
            });
        }
    }
}

export function grantKmsKeyPerm(key: kms.IKey, logGroupName ? : string): void {
    key.addToResourcePolicy(new iam.PolicyStatement({
        principals: [new iam.ServicePrincipal('logs.amazonaws.com')],
        actions: [
            'kms:Encrypt*',
            'kms:ReEncrypt*',
            'kms:Decrypt*',
            'kms:GenerateDataKey*',
            'kms:Describe*',
        ],
        resources: [
            '*',
        ],
        conditions: {
            ArnLike: {
                'kms:EncryptionContext:aws:logs:arn': cdk.Arn.format({
                    service: 'logs',
                    resource: 'log-group',
                    resourceName: logGroupName ? logGroupName : '*',
                    sep: ':',
                }, cdk.Stack.of(key)),
            },
        },
    }));
}