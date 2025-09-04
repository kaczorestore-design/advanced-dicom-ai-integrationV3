// HL7 v2 Message Handler
// Supports common HL7 message types used in healthcare integration

// HL7 Message Structure
interface HL7Segment {
  name: string;
  fields: string[];
  raw: string;
}

interface HL7Message {
  messageType: string;
  triggerEvent: string;
  messageControlId: string;
  segments: HL7Segment[];
  raw: string;
}

// HL7 Field Definitions
interface HL7Field {
  value: string;
  components: string[];
  subcomponents: string[][];
}

// Patient Information (PID segment)
interface HL7Patient {
  patientId: string;
  patientIdList: Array<{
    id: string;
    assigningAuthority: string;
    identifierTypeCode: string;
  }>;
  patientName: {
    familyName: string;
    givenName: string;
    middleName?: string;
    suffix?: string;
    prefix?: string;
  };
  dateOfBirth: string;
  sex: string;
  race?: string;
  address?: {
    streetAddress: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  phoneNumber?: string;
  maritalStatus?: string;
  religion?: string;
  patientAccountNumber?: string;
  ssn?: string;
}

// Order Information (OBR segment)
interface HL7Order {
  setId: string;
  placerOrderNumber: string;
  fillerOrderNumber: string;
  universalServiceId: {
    identifier: string;
    text: string;
    nameOfCodingSystem: string;
  };
  priority?: string;
  requestedDateTime?: string;
  observationDateTime?: string;
  observationEndDateTime?: string;
  collectionVolume?: string;
  collectorIdentifier?: string;
  specimenActionCode?: string;
  dangerCode?: string;
  relevantClinicalInfo?: string;
  specimenReceivedDateTime?: string;
  specimenSource?: string;
  orderingProvider?: {
    id: string;
    familyName: string;
    givenName: string;
  };
  orderCallbackPhoneNumber?: string;
  placerField1?: string;
  placerField2?: string;
  fillerField1?: string;
  fillerField2?: string;
  resultsRptStatusChngDateTime?: string;
  chargeToParctice?: string;
  diagnosticServSectId?: string;
  resultStatus?: string;
  parentResult?: string;
  quantityTiming?: string;
  resultCopiesTo?: string;
  parent?: string;
  transportationMode?: string;
  reasonForStudy?: string;
  principalResultInterpreter?: string;
  assistantResultInterpreter?: string;
  technician?: string;
  transcriptionist?: string;
  scheduledDateTime?: string;
  numberOfSampleContainers?: string;
  transportLogisticsOfCollectedSample?: string;
  collectorsComment?: string;
  transportArrangementResponsibility?: string;
  transportArranged?: string;
  escortRequired?: string;
  plannedPatientTransportComment?: string;
}

// Observation/Result Information (OBX segment)
interface HL7Observation {
  setId: string;
  valueType: string;
  observationIdentifier: {
    identifier: string;
    text: string;
    nameOfCodingSystem: string;
  };
  observationSubId?: string;
  observationValue: string;
  units?: string;
  referencesRange?: string;
  abnormalFlags?: string;
  probability?: string;
  natureOfAbnormalTest?: string;
  observationResultStatus: string;
  dateLastObsNormalValues?: string;
  userDefinedAccessChecks?: string;
  dateTimeOfObservation?: string;
  producersId?: string;
  responsibleObserver?: string;
  observationMethod?: string;
}

// Message Header (MSH segment)
interface HL7MessageHeader {
  fieldSeparator: string;
  encodingCharacters: string;
  sendingApplication: string;
  sendingFacility: string;
  receivingApplication: string;
  receivingFacility: string;
  dateTimeOfMessage: string;
  security?: string;
  messageType: {
    messageCode: string;
    triggerEvent: string;
    messageStructure: string;
  };
  messageControlId: string;
  processingId: string;
  versionId: string;
  sequenceNumber?: string;
  continuationPointer?: string;
  acceptAcknowledgmentType?: string;
  applicationAcknowledgmentType?: string;
  countryCode?: string;
  characterSet?: string;
  principalLanguageOfMessage?: string;
}

// HL7 Parser Class
class HL7Parser {
  private static readonly FIELD_SEPARATOR = '|';
  private static readonly COMPONENT_SEPARATOR = '^';
  private static readonly SUBCOMPONENT_SEPARATOR = '&';

  // Parse HL7 message
  static parseMessage(hl7String: string): HL7Message {
    const segments = hl7String.split(/\r\n?|\n/).filter(line => line.trim());
    const parsedSegments: HL7Segment[] = [];
    
    let messageType = '';
    let triggerEvent = '';
    let messageControlId = '';

    for (const segmentString of segments) {
      const segment = this.parseSegment(segmentString);
      parsedSegments.push(segment);

      // Extract message info from MSH segment
      if (segment.name === 'MSH') {
        const messageTypeField = segment.fields[8] || '';
        const messageTypeParts = messageTypeField.split(this.COMPONENT_SEPARATOR);
        messageType = messageTypeParts[0] || '';
        triggerEvent = messageTypeParts[1] || '';
        messageControlId = segment.fields[9] || '';
      }
    }

    return {
      messageType,
      triggerEvent,
      messageControlId,
      segments: parsedSegments,
      raw: hl7String
    };
  }

  // Parse HL7 segment
  static parseSegment(segmentString: string): HL7Segment {
    const fields = segmentString.split(this.FIELD_SEPARATOR);
    const segmentName = fields[0];
    
    // For MSH segment, handle special case where field separator is part of the segment
    if (segmentName === 'MSH') {
      fields[1] = this.FIELD_SEPARATOR + (fields[1] || '');
    }

    return {
      name: segmentName,
      fields: fields.slice(1), // Remove segment name
      raw: segmentString
    };
  }

  // Parse HL7 field with components and subcomponents
  static parseField(fieldString: string): HL7Field {
    const components = fieldString.split(this.COMPONENT_SEPARATOR);
    const subcomponents = components.map(comp => 
      comp.split(this.SUBCOMPONENT_SEPARATOR)
    );

    return {
      value: fieldString,
      components,
      subcomponents
    };
  }

  // Extract patient information from PID segment
  static extractPatient(message: HL7Message): HL7Patient | null {
    const pidSegment = message.segments.find(seg => seg.name === 'PID');
    if (!pidSegment) return null;

    const fields = pidSegment.fields;
    
    // Parse patient ID list (field 3)
    const patientIdList: HL7Patient['patientIdList'] = [];
    if (fields[2]) {
      const idField = this.parseField(fields[2]);
      idField.components.forEach((comp, index) => {
        if (comp) {
          const subcomps = idField.subcomponents[index];
          patientIdList.push({
            id: subcomps[0] || comp,
            assigningAuthority: subcomps[3] || '',
            identifierTypeCode: subcomps[4] || ''
          });
        }
      });
    }

    // Parse patient name (field 5)
    const nameField = this.parseField(fields[4] || '');
    const patientName = {
      familyName: nameField.components[0] || '',
      givenName: nameField.components[1] || '',
      middleName: nameField.components[2],
      suffix: nameField.components[3],
      prefix: nameField.components[4]
    };

    // Parse address (field 11)
    let address: HL7Patient['address'];
    if (fields[10]) {
      const addressField = this.parseField(fields[10]);
      address = {
        streetAddress: addressField.components[0] || '',
        city: addressField.components[2] || '',
        state: addressField.components[3] || '',
        zipCode: addressField.components[4] || '',
        country: addressField.components[5] || ''
      };
    }

    return {
      patientId: fields[2] ? this.parseField(fields[2]).components[0] : '',
      patientIdList,
      patientName,
      dateOfBirth: fields[6] || '',
      sex: fields[7] || '',
      race: fields[9],
      address,
      phoneNumber: fields[12] ? this.parseField(fields[12]).components[0] : undefined,
      maritalStatus: fields[15],
      religion: fields[16],
      patientAccountNumber: fields[17],
      ssn: fields[18]
    };
  }

  // Extract order information from OBR segment
  static extractOrder(message: HL7Message): HL7Order | null {
    const obrSegment = message.segments.find(seg => seg.name === 'OBR');
    if (!obrSegment) return null;

    const fields = obrSegment.fields;
    
    // Parse universal service ID (field 4)
    const serviceIdField = this.parseField(fields[3] || '');
    const universalServiceId = {
      identifier: serviceIdField.components[0] || '',
      text: serviceIdField.components[1] || '',
      nameOfCodingSystem: serviceIdField.components[2] || ''
    };

    // Parse ordering provider (field 16)
    let orderingProvider: HL7Order['orderingProvider'];
    if (fields[15]) {
      const providerField = this.parseField(fields[15]);
      orderingProvider = {
        id: providerField.components[0] || '',
        familyName: providerField.components[1] || '',
        givenName: providerField.components[2] || ''
      };
    }

    return {
      setId: fields[0] || '',
      placerOrderNumber: fields[1] || '',
      fillerOrderNumber: fields[2] || '',
      universalServiceId,
      priority: fields[4],
      requestedDateTime: fields[5],
      observationDateTime: fields[6],
      observationEndDateTime: fields[7],
      collectionVolume: fields[8],
      collectorIdentifier: fields[9],
      specimenActionCode: fields[10],
      dangerCode: fields[11],
      relevantClinicalInfo: fields[12],
      specimenReceivedDateTime: fields[13],
      specimenSource: fields[14],
      orderingProvider,
      orderCallbackPhoneNumber: fields[16],
      placerField1: fields[17],
      placerField2: fields[18],
      fillerField1: fields[19],
      fillerField2: fields[20],
      resultsRptStatusChngDateTime: fields[21],
      chargeToParctice: fields[22],
      diagnosticServSectId: fields[23],
      resultStatus: fields[24],
      parentResult: fields[25],
      quantityTiming: fields[26],
      resultCopiesTo: fields[27],
      parent: fields[28],
      transportationMode: fields[29],
      reasonForStudy: fields[30],
      principalResultInterpreter: fields[31],
      assistantResultInterpreter: fields[32],
      technician: fields[33],
      transcriptionist: fields[34],
      scheduledDateTime: fields[35],
      numberOfSampleContainers: fields[36],
      transportLogisticsOfCollectedSample: fields[37],
      collectorsComment: fields[38],
      transportArrangementResponsibility: fields[39],
      transportArranged: fields[40],
      escortRequired: fields[41],
      plannedPatientTransportComment: fields[42]
    };
  }

  // Extract observations from OBX segments
  static extractObservations(message: HL7Message): HL7Observation[] {
    const obxSegments = message.segments.filter(seg => seg.name === 'OBX');
    const observations: HL7Observation[] = [];

    for (const segment of obxSegments) {
      const fields = segment.fields;
      
      // Parse observation identifier (field 3)
      const identifierField = this.parseField(fields[2] || '');
      const observationIdentifier = {
        identifier: identifierField.components[0] || '',
        text: identifierField.components[1] || '',
        nameOfCodingSystem: identifierField.components[2] || ''
      };

      observations.push({
        setId: fields[0] || '',
        valueType: fields[1] || '',
        observationIdentifier,
        observationSubId: fields[3],
        observationValue: fields[4] || '',
        units: fields[5],
        referencesRange: fields[6],
        abnormalFlags: fields[7],
        probability: fields[8],
        natureOfAbnormalTest: fields[9],
        observationResultStatus: fields[10] || '',
        dateLastObsNormalValues: fields[11],
        userDefinedAccessChecks: fields[12],
        dateTimeOfObservation: fields[13],
        producersId: fields[14],
        responsibleObserver: fields[15],
        observationMethod: fields[16]
      });
    }

    return observations;
  }

  // Extract message header from MSH segment
  static extractMessageHeader(message: HL7Message): HL7MessageHeader | null {
    const mshSegment = message.segments.find(seg => seg.name === 'MSH');
    if (!mshSegment) return null;

    const fields = mshSegment.fields;
    
    // Parse message type (field 9)
    const messageTypeField = this.parseField(fields[8] || '');
    const messageType = {
      messageCode: messageTypeField.components[0] || '',
      triggerEvent: messageTypeField.components[1] || '',
      messageStructure: messageTypeField.components[2] || ''
    };

    return {
      fieldSeparator: fields[0]?.[0] || '|',
      encodingCharacters: fields[0]?.substring(1) || '^~\\&',
      sendingApplication: fields[2] || '',
      sendingFacility: fields[3] || '',
      receivingApplication: fields[4] || '',
      receivingFacility: fields[5] || '',
      dateTimeOfMessage: fields[6] || '',
      security: fields[7],
      messageType,
      messageControlId: fields[9] || '',
      processingId: fields[10] || '',
      versionId: fields[11] || '',
      sequenceNumber: fields[12],
      continuationPointer: fields[13],
      acceptAcknowledgmentType: fields[14],
      applicationAcknowledgmentType: fields[15],
      countryCode: fields[16],
      characterSet: fields[17],
      principalLanguageOfMessage: fields[18]
    };
  }

  // Format HL7 date
  static formatHL7Date(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}${month}${day}${hours}${minutes}${seconds}`;
  }

  // Parse HL7 date
  static parseHL7Date(hl7Date: string): Date {
    if (!hl7Date || hl7Date.length < 8) {
      return new Date();
    }

    const year = parseInt(hl7Date.substring(0, 4));
    const month = parseInt(hl7Date.substring(4, 6)) - 1; // Month is 0-based
    const day = parseInt(hl7Date.substring(6, 8));
    const hours = hl7Date.length >= 10 ? parseInt(hl7Date.substring(8, 10)) : 0;
    const minutes = hl7Date.length >= 12 ? parseInt(hl7Date.substring(10, 12)) : 0;
    const seconds = hl7Date.length >= 14 ? parseInt(hl7Date.substring(12, 14)) : 0;

    return new Date(year, month, day, hours, minutes, seconds);
  }

  // Escape HL7 special characters
  static escapeHL7(text: string): string {
    return text
      .replace(/\\/g, '\\E\\')
      .replace(/\|/g, '\\F\\')
      .replace(/\^/g, '\\S\\')
      .replace(/&/g, '\\T\\')
      .replace(/~/g, '\\R\\');
  }

  // Unescape HL7 special characters
  static unescapeHL7(text: string): string {
    return text
      .replace(/\\R\\/g, '~')
      .replace(/\\T\\/g, '&')
      .replace(/\\S\\/g, '^')
      .replace(/\\F\\/g, '|')
      .replace(/\\E\\/g, '\\');
  }
}

// HL7 Message Builder
class HL7MessageBuilder {
  private segments: string[] = [];
  private messageControlId: string;
  private sendingApplication: string;
  private sendingFacility: string;
  private receivingApplication: string;
  private receivingFacility: string;

  constructor(
    sendingApplication: string,
    sendingFacility: string,
    receivingApplication: string,
    receivingFacility: string
  ) {
    this.sendingApplication = sendingApplication;
    this.sendingFacility = sendingFacility;
    this.receivingApplication = receivingApplication;
    this.receivingFacility = receivingFacility;
    this.messageControlId = this.generateMessageControlId();
  }

  private generateMessageControlId(): string {
    return Date.now().toString() + Math.random().toString(36).substring(2, 9);
  }

  // Add MSH segment
  addMSH(messageType: string, triggerEvent: string, version: string = '2.5'): this {
    const timestamp = HL7Parser.formatHL7Date(new Date());
    const msh = [
      'MSH',
      '|^~\\&',
      this.sendingApplication,
      this.sendingFacility,
      this.receivingApplication,
      this.receivingFacility,
      timestamp,
      '',
      `${messageType}^${triggerEvent}^${messageType}_${triggerEvent}`,
      this.messageControlId,
      'P',
      version
    ].join('|');
    
    this.segments.push(msh);
    return this;
  }

  // Add PID segment
  addPID(patient: Partial<HL7Patient>): this {
    const pid = [
      'PID',
      '1', // Set ID
      '', // Patient ID (external)
      patient.patientId || '', // Patient identifier list
      '', // Alternate patient ID
      `${patient.patientName?.familyName || ''}^${patient.patientName?.givenName || ''}^${patient.patientName?.middleName || ''}^${patient.patientName?.suffix || ''}^${patient.patientName?.prefix || ''}`,
      '', // Mother's maiden name
      patient.dateOfBirth || '',
      patient.sex || '',
      '', // Patient alias
      patient.race || '',
      patient.address ? `${patient.address.streetAddress}^^${patient.address.city}^${patient.address.state}^${patient.address.zipCode}^${patient.address.country}` : '',
      '', // County code
      patient.phoneNumber || '',
      '', // Business phone
      '', // Primary language
      patient.maritalStatus || '',
      patient.religion || '',
      patient.patientAccountNumber || '',
      patient.ssn || ''
    ].join('|');
    
    this.segments.push(pid);
    return this;
  }

  // Add OBR segment
  addOBR(order: Partial<HL7Order>): this {
    const obr = [
      'OBR',
      order.setId || '1',
      order.placerOrderNumber || '',
      order.fillerOrderNumber || '',
      order.universalServiceId ? `${order.universalServiceId.identifier}^${order.universalServiceId.text}^${order.universalServiceId.nameOfCodingSystem}` : '',
      order.priority || '',
      order.requestedDateTime || '',
      order.observationDateTime || '',
      order.observationEndDateTime || '',
      order.collectionVolume || '',
      order.collectorIdentifier || '',
      order.specimenActionCode || '',
      order.dangerCode || '',
      order.relevantClinicalInfo || '',
      order.specimenReceivedDateTime || '',
      order.specimenSource || '',
      order.orderingProvider ? `${order.orderingProvider.id}^${order.orderingProvider.familyName}^${order.orderingProvider.givenName}` : '',
      order.orderCallbackPhoneNumber || ''
    ].join('|');
    
    this.segments.push(obr);
    return this;
  }

  // Add OBX segment
  addOBX(observation: Partial<HL7Observation>): this {
    const obx = [
      'OBX',
      observation.setId || '1',
      observation.valueType || 'ST',
      observation.observationIdentifier ? `${observation.observationIdentifier.identifier}^${observation.observationIdentifier.text}^${observation.observationIdentifier.nameOfCodingSystem}` : '',
      observation.observationSubId || '',
      observation.observationValue || '',
      observation.units || '',
      observation.referencesRange || '',
      observation.abnormalFlags || '',
      observation.probability || '',
      observation.natureOfAbnormalTest || '',
      observation.observationResultStatus || 'F',
      observation.dateLastObsNormalValues || '',
      observation.userDefinedAccessChecks || '',
      observation.dateTimeOfObservation || '',
      observation.producersId || '',
      observation.responsibleObserver || '',
      observation.observationMethod || ''
    ].join('|');
    
    this.segments.push(obx);
    return this;
  }

  // Add custom segment
  addSegment(segmentString: string): this {
    this.segments.push(segmentString);
    return this;
  }

  // Build the complete HL7 message
  build(): string {
    return this.segments.join('\r');
  }

  // Get message control ID
  getMessageControlId(): string {
    return this.messageControlId;
  }
}

// HL7 Acknowledgment Builder
class HL7AckBuilder {
  static buildACK(
    originalMessage: HL7Message,
    acknowledgmentCode: 'AA' | 'AE' | 'AR' | 'CA' | 'CE' | 'CR',
    textMessage?: string,
    sendingApplication: string = 'DICOM_VIEWER',
    sendingFacility: string = 'HOSPITAL'
  ): string {
    const header = HL7Parser.extractMessageHeader(originalMessage);
    if (!header) {
      throw new Error('Cannot build ACK: Original message has no MSH segment');
    }

    const builder = new HL7MessageBuilder(
      sendingApplication,
      sendingFacility,
      header.sendingApplication,
      header.sendingFacility
    );

    builder.addMSH('ACK', header.messageType.triggerEvent, header.versionId);

    // Add MSA segment
    const msa = [
      'MSA',
      acknowledgmentCode,
      header.messageControlId,
      textMessage || ''
    ].join('|');
    
    builder.addSegment(msa);

    return builder.build();
  }
}

// HL7 Validator
class HL7Validator {
  static validateMessage(message: HL7Message): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for required MSH segment
    const mshSegment = message.segments.find(seg => seg.name === 'MSH');
    if (!mshSegment) {
      errors.push('Missing required MSH segment');
    } else {
      // Validate MSH fields
      if (!mshSegment.fields[8]) {
        errors.push('MSH segment missing message type');
      }
      if (!mshSegment.fields[9]) {
        errors.push('MSH segment missing message control ID');
      }
      if (!mshSegment.fields[11]) {
        errors.push('MSH segment missing version ID');
      }
    }

    // Validate message structure based on message type
    if (message.messageType === 'ADT') {
      const pidSegment = message.segments.find(seg => seg.name === 'PID');
      if (!pidSegment) {
        errors.push('ADT message missing required PID segment');
      }
    }

    if (message.messageType === 'ORM' || message.messageType === 'ORU') {
      const obrSegment = message.segments.find(seg => seg.name === 'OBR');
      if (!obrSegment) {
        errors.push(`${message.messageType} message missing required OBR segment`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  static validateSegment(segment: HL7Segment): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Basic segment validation
    if (!segment.name) {
      errors.push('Segment missing name');
    }

    if (segment.name.length !== 3) {
      errors.push('Segment name must be exactly 3 characters');
    }

    // Segment-specific validation
    switch (segment.name) {
      case 'MSH':
        if (segment.fields.length < 12) {
          errors.push('MSH segment must have at least 12 fields');
        }
        break;
      case 'PID':
        if (segment.fields.length < 5) {
          errors.push('PID segment must have at least 5 fields');
        }
        break;
      case 'OBR':
        if (segment.fields.length < 4) {
          errors.push('OBR segment must have at least 4 fields');
        }
        break;
      case 'OBX':
        if (segment.fields.length < 11) {
          errors.push('OBX segment must have at least 11 fields');
        }
        break;
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export {
  HL7Parser,
  HL7MessageBuilder,
  HL7AckBuilder,
  HL7Validator,
  type HL7Message,
  type HL7Segment,
  type HL7Field,
  type HL7Patient,
  type HL7Order,
  type HL7Observation,
  type HL7MessageHeader
};