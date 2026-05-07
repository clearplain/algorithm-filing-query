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
