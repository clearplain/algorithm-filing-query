export type FilingRecord = {
  id: string;
  filingType: string;
  batch: string;
  announcementDate: string;
  algorithmName: string;
  algorithmClass: string;
  role: string;
  entityName: string;
  product: string;
  purpose: string;
  recordNumber: string;
  remark: string;
  province: string;
  domainTags: string[];
  sourceUrl: string;
  sourceFile: string;
};

export type Facets = {
  filingTypes: string[];
  batches: string[];
  algorithmClasses: string[];
  provinces: string[];
  domainTags: string[];
};

export type Stats = {
  recordCount: number;
  domesticCount: number;
  deepCount: number;
  sourceCount: number;
  duplicateCount?: number;
  generatedAt: string;
};

export type Source = {
  title: string;
  batch: string;
  date: string;
  url: string;
  localFile: string | null;
  status: string;
  message: string;
};

export type Law = {
  title: string;
  sourceUrl: string;
  effectiveDate: string;
  chapters: Array<{
    chapter: string;
    articles: Array<{
      number: string;
      text: string;
    }>;
  }>;
};

export type FinancialRecord = {
  id: string;
  regime: string;
  regionType: string;
  batch: string;
  announcementDate: string;
  sequence: number;
  institutionName: string;
  englishName: string;
  serviceContent: string;
  serviceChannel: string;
  recordNumber: string;
  province: string;
  city: string;
  sourceTitle: string;
  sourceUrl: string;
  sourceFile: string;
  note: string;
  serviceTypes: string[];
  year: string;
};

export type FinancialFacets = {
  regimes: string[];
  regionTypes: string[];
  batches: string[];
  provinces: string[];
  cities: string[];
  serviceTypes: string[];
  years: string[];
};

export type FinancialStats = {
  recordCount: number;
  domesticCount: number;
  overseasDirectCount: number;
  overseasInvestedCount: number;
  sourceCount: number;
  loadedSourceCount: number;
  announcementOnlySourceCount: number;
  generatedAt: string;
  note: string;
};

export type FinancialSource = {
  title: string;
  type: string;
  batch: string;
  date: string;
  url: string;
  localFile: string | null;
  status: string;
  recordCount: number;
  loadedCount: number;
  message: string;
};

export type FinancialLaw = Law;
