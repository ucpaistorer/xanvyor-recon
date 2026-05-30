import { NextRequest, NextResponse } from 'next/server';
import { safeWebSearch, safeAIAnalysis, sequentialWebSearch } from '@/lib/zai';

// Parse search results into uniform format
function parseResults(results: unknown[]) {
  return (results as Array<Record<string, string>>)
    .map((r) => ({
      url: r.url || '',
      title: r.name || '',
      snippet: r.snippet || '',
      domain: r.host_name || '',
    }))
    .filter((r) => r.title || r.snippet);
}

// Indonesian bank codes and names
const BANK_CODES: Record<string, { name: string; type: string; swiftCode: string }> = {
  '001': { name: 'Bank Central Asia (BCA)', type: 'Private', swiftCode: 'CENAIDJA' },
  '002': { name: 'Bank Rakyat Indonesia (BRI)', type: 'State-Owned', swiftCode: 'BRINIDJA' },
  '003': { name: 'Bank Negara Indonesia (BNI)', type: 'State-Owned', swiftCode: 'BNINIDJA' },
  '004': { name: 'Bank Mandiri', type: 'State-Owned', swiftCode: 'BMRIIDJA' },
  '005': { name: 'Bank Danamon Indonesia', type: 'Private', swiftCode: 'BDINIDJA' },
  '006': { name: 'Bank Permata', type: 'Private', swiftCode: 'BBBAIDJA' },
  '007': { name: 'Bank Panin', type: 'Private', swiftCode: 'PINBIDJA' },
  '008': { name: 'Bank CIMB Niaga', type: 'Private', swiftCode: 'BNIAIDJA' },
  '009': { name: 'Bank OCBC NISP', type: 'Private', swiftCode: 'NISPIDJA' },
  '010': { name: 'Bank UOB Indonesia', type: 'Private', swiftCode: 'UOBBIDJA' },
  '011': { name: 'Bank Mega', type: 'Private', swiftCode: 'MEGAIDJA' },
  '012': { name: 'Bank BTPN', type: 'Private', swiftCode: 'BTPNIDJA' },
  '013': { name: 'Bank Tabungan Negara (BTN)', type: 'State-Owned', swiftCode: 'BTANIDJA' },
  '014': { name: 'Bank Sinarmas', type: 'Private', swiftCode: 'SMBRIDJA' },
  '015': { name: 'Bank Commonwealth', type: 'Private', swiftCode: 'BCOMIDJA' },
  '016': { name: 'Bank Maybank Indonesia', type: 'Private', swiftCode: 'MBBKIDJA' },
  '017': { name: 'Bank HSBC Indonesia', type: 'Foreign', swiftCode: 'HSBCIDJA' },
  '018': { name: 'Bank Citibank N.A.', type: 'Foreign', swiftCode: 'CITIIDJA' },
  '019': { name: 'Bank J.P. Morgan', type: 'Foreign', swiftCode: 'CHASIDJA' },
  '020': { name: 'Bank DBS Indonesia', type: 'Private', swiftCode: 'DBSBIDJA' },
  '021': { name: 'Bank BJB', type: 'Regional Development', swiftCode: 'BJABIDJA' },
  '022': { name: 'Bank BPD DIY', type: 'Regional Development', swiftCode: 'BPDYIDJA' },
  '023': { name: 'Bank Jateng', type: 'Regional Development', swiftCode: 'BJTMIDJA' },
  '024': { name: 'Bank Jatim', type: 'Regional Development', swiftCode: 'BJTMIDJA' },
  '025': { name: 'Bank Sumut', type: 'Regional Development', swiftCode: 'BSMDIDJA' },
  '026': { name: 'Bank Nagari', type: 'Regional Development', swiftCode: 'BNAGIDJA' },
  '027': { name: 'Bank Lampung', type: 'Regional Development', swiftCode: 'BLAPIDJA' },
  '028': { name: 'Bank Kalsel', type: 'Regional Development', swiftCode: 'BKSLIDJA' },
  '029': { name: 'Bank Kalbar', type: 'Regional Development', swiftCode: 'BKKBIDJA' },
  '030': { name: 'Bank Sulselbar', type: 'Regional Development', swiftCode: 'BSLBIDJA' },
  '031': { name: 'Bank NTB Syariah', type: 'Regional Development', swiftCode: 'BNTBIDJA' },
  '032': { name: 'Bank Papua', type: 'Regional Development', swiftCode: 'BPAPIDJA' },
  '033': { name: 'Bank Maluku Malut', type: 'Regional Development', swiftCode: 'BMMTIDJA' },
  '034': { name: 'Bank Sumsel Babel', type: 'Regional Development', swiftCode: 'BSLBIDJA' },
  '035': { name: 'Bank Riau Kepri', type: 'Regional Development', swiftCode: 'BRIPIDJA' },
  '036': { name: 'Bank Jambi', type: 'Regional Development', swiftCode: 'BJMIIDJA' },
  '037': { name: 'Bank Aceh Syariah', type: 'Regional Development', swiftCode: 'BACHIDJA' },
  '038': { name: 'Bank Sultra', type: 'Regional Development', swiftCode: 'BSTLIDJA' },
  '039': { name: 'Bank Kalteng', type: 'Regional Development', swiftCode: 'BKTLIDJA' },
  '040': { name: 'Bank Kaltimtara', type: 'Regional Development', swiftCode: 'BKTMIDJA' },
  '045': { name: 'Bank Syariah Indonesia (BSI)', type: 'State-Owned Syariah', swiftCode: 'BSIIIDJA' },
  '100': { name: 'Bank Indonesia', type: 'Central Bank', swiftCode: 'INDOIDJA' },
  '101': { name: 'Bank Infombank', type: 'Private', swiftCode: 'BKDKIDJA' },
  '110': { name: 'Bank BCA Syariah', type: 'Private Syariah', swiftCode: 'BCASIDJA' },
  '114': { name: 'Bank Woori Saudara', type: 'Private', swiftCode: 'WORIIDJA' },
  '115': { name: 'Bank Seabank Indonesia', type: 'Digital', swiftCode: 'SEABIDJA' },
  '116': { name: 'Bank Jago', type: 'Digital', swiftCode: 'JAGOIDJA' },
  '117': { name: 'Bank Neo Commerce', type: 'Digital', swiftCode: 'NEOCIDJA' },
  '118': { name: 'Bank Allo Bank Indonesia', type: 'Digital', swiftCode: 'ALLOIDJA' },
  '119': { name: 'Bank Amar Indonesia', type: 'Digital', swiftCode: 'AMARIDJA' },
  '120': { name: 'Bank Index Selindo', type: 'Private', swiftCode: 'INXDIDJA' },
  '121': { name: 'Bank Nobu (Nationalnobu)', type: 'Private', swiftCode: 'NOBUIDJA' },
  '122': { name: 'Bank Maspion', type: 'Private', swiftCode: 'MASPERSIDJA' },
  '123': { name: 'Bank Mestika Dharma', type: 'Private', swiftCode: 'MDRIIDJA' },
  '124': { name: 'Bank Multi Artabakti', type: 'Private', swiftCode: 'MABIIDJA' },
  '125': { name: 'Bank Mayora', type: 'Private', swiftCode: 'MYRAIDJA' },
  '126': { name: 'Bank IBK Indonesia', type: 'Private', swiftCode: 'IBKIIDJA' },
  '127': { name: 'Bank BNI Agro', type: 'Private', swiftCode: 'AGROIDJA' },
  '128': { name: 'Bank CTBC Indonesia', type: 'Private', swiftCode: 'CTBCIDJA' },
  '129': { name: 'Bank QNB Indonesia', type: 'Private', swiftCode: 'QNBKIDJA' },
  '130': { name: 'Bank Muamalat Indonesia', type: 'Private Syariah', swiftCode: 'MUABIDJA' },
  '131': { name: 'Bank Victoria Syariah', type: 'Private Syariah', swiftCode: 'VICSIDJA' },
  '132': { name: 'Bank Panin Dubai Syariah', type: 'Private Syariah', swiftCode: 'PDUBIDJA' },
  '133': { name: 'Bank Bukopin', type: 'Private', swiftCode: 'BKPIIDJA' },
  '134': { name: 'Bank Risna Salama', type: 'Private', swiftCode: 'RISNIDJA' },
  '135': { name: 'Bank Multi Sarana', type: 'Private', swiftCode: 'MSRNIDJA' },
  '136': { name: 'Bank Artos Indonesia', type: 'Private', swiftCode: 'ARTOIDJA' },
  '137': { name: 'Bank Ina Perdana', type: 'Private', swiftCode: 'INPDIDJA' },
  '138': { name: 'Bank Maybank Syariah', type: 'Private Syariah', swiftCode: 'MBBKIDJA' },
  '139': { name: 'Bank Resona Perdania', type: 'Private', swiftCode: 'RSPRIDJA' },
  '140': { name: 'Bank Mizuho Indonesia', type: 'Foreign', swiftCode: 'MHCBIDJA' },
  '141': { name: 'Bank BNP Paribas', type: 'Foreign', swiftCode: 'BNPAIDJA' },
  '142': { name: 'Bank Sumitomo Mitsui Indonesia', type: 'Foreign', swiftCode: 'SMBCIDJA' },
  '143': { name: 'Bank Deutsche Indonesia', type: 'Foreign', swiftCode: 'DEUTIDJA' },
  '144': { name: 'Bank Artha Graha', type: 'Private', swiftCode: 'ARTGIDJA' },
  '145': { name: 'Bank Capital Indonesia', type: 'Private', swiftCode: 'CPTLIDJA' },
  '146': { name: 'Bank ICBC Indonesia', type: 'Foreign', swiftCode: 'ICBKIDJA' },
  '147': { name: 'Bank Sinarmas Syariah', type: 'Private Syariah', swiftCode: 'SMSRIDJA' },
  '148': { name: 'Bank Royal Indonesia', type: 'Private', swiftCode: 'ROYLIDJA' },
  '149': { name: 'Bank Nationalnobu', type: 'Private', swiftCode: 'NOBUIDJA' },
  '150': { name: 'Bank Dinar Indonesia', type: 'Private', swiftCode: 'DNARIDJA' },
  '151': { name: 'Bank Tabungan Pensiunan Nasional (BTPN)', type: 'Private', swiftCode: 'BTPNIDJA' },
  '152': { name: 'Bank Andara', type: 'Private', swiftCode: 'ANDRIDJA' },
  '153': { name: 'Bank Sahabat Sampoerna', type: 'Private', swiftCode: 'SAMPIDJA' },
  '154': { name: 'Bank Dbs Indonesia', type: 'Private', swiftCode: 'DBSBIDJA' },
  '155': { name: 'Bank Bca Digital (Blu)', type: 'Digital', swiftCode: 'BCADIDJA' },
  '156': { name: 'Bank Aladin Syariah', type: 'Digital', swiftCode: 'ALADIDJA' },
  '157': { name: 'Bank Superbank (Seabank)', type: 'Digital', swiftCode: 'SEABIDJA' },
  '158': { name: 'Bank Raykat Indonesia Agrin', type: 'State-Owned', swiftCode: 'BRINIDJA' },
  '159': { name: 'Bank Bni Syariah', type: 'State-Owned Syariah', swiftCode: 'BNISIDJA' },
  '160': { name: 'Bank Mandiri Taspen', type: 'State-Owned', swiftCode: 'MTSPIDJA' },
  '161': { name: 'Bank Sinar Harapan Bali', type: 'Private', swiftCode: 'BSHBIDJA' },
  '162': { name: 'Bank Kesejahteraan Ekonomi', type: 'Private', swiftCode: 'BKSEIDJA' },
  '163': { name: 'Bank Permata Syariah', type: 'Private Syariah', swiftCode: 'PRMSIDJA' },
  '164': { name: 'Bank KEB Hana Indonesia', type: 'Private', swiftCode: 'KOEXIDJA' },
  '165': { name: 'Bank Mnc Bank', type: 'Private', swiftCode: 'MNCBIDJA' },
  '166': { name: 'Bank Sri Parthivi', type: 'Private', swiftCode: 'SRPTIDJA' },
  '167': { name: 'Bank Bjb Syariah', type: 'Regional Development Syariah', swiftCode: 'BJBSIDJA' },
  '168': { name: 'Bank Bnp Paribas', type: 'Foreign', swiftCode: 'BNPAIDJA' },
  '169': { name: 'Bank Of China', type: 'Foreign', swiftCode: 'BKCHIDJA' },
  '200': { name: 'Bank Tabungan Negara (BTN)', type: 'State-Owned', swiftCode: 'BTANIDJA' },
  '301': { name: 'Citibank N.A.', type: 'Foreign', swiftCode: 'CITIIDJA' },
  '302': { name: 'Bank of America', type: 'Foreign', swiftCode: 'BOFAIDJA' },
  '303': { name: 'Bank of India Indonesia', type: 'Foreign', swiftCode: 'BKIDIDJA' },
  '304': { name: 'Standard Chartered Bank', type: 'Foreign', swiftCode: 'SCBLIDJA' },
  '305': { name: 'Deutsche Bank', type: 'Foreign', swiftCode: 'DEUTIDJA' },
  '306': { name: 'HSBC', type: 'Foreign', swiftCode: 'HSBCIDJA' },
  '307': { name: 'JP Morgan Chase', type: 'Foreign', swiftCode: 'CHASIDJA' },
  '308': { name: 'Rabobank', type: 'Foreign', swiftCode: 'RABOIDJA' },
  '401': { name: 'BCA', type: 'Private', swiftCode: 'CENAIDJA' },
  '402': { name: 'BRI', type: 'State-Owned', swiftCode: 'BRINIDJA' },
  '403': { name: 'BNI', type: 'State-Owned', swiftCode: 'BNINIDJA' },
  '404': { name: 'Mandiri', type: 'State-Owned', swiftCode: 'BMRIIDJA' },
  '425': { name: 'Bank BJB', type: 'Regional Development', swiftCode: 'BJABIDJA' },
  '426': { name: 'Bank BPD DIY', type: 'Regional Development', swiftCode: 'BPDYIDJA' },
  '427': { name: 'Bank Jateng', type: 'Regional Development', swiftCode: 'BJTMIDJA' },
  '428': { name: 'Bank Jatim', type: 'Regional Development', swiftCode: 'BJTMIDJA' },
  '441': { name: 'Bank Sumut', type: 'Regional Development', swiftCode: 'BSMDIDJA' },
  '442': { name: 'Bank Nagari', type: 'Regional Development', swiftCode: 'BNAGIDJA' },
  '443': { name: 'Bank Lampung', type: 'Regional Development', swiftCode: 'BLAPIDJA' },
  '444': { name: 'Bank Kalsel', type: 'Regional Development', swiftCode: 'BKSLIDJA' },
  '445': { name: 'Bank Kalbar', type: 'Regional Development', swiftCode: 'BKKBIDJA' },
  '446': { name: 'Bank Sulselbar', type: 'Regional Development', swiftCode: 'BSLBIDJA' },
  '447': { name: 'Bank NTB', type: 'Regional Development', swiftCode: 'BNTBIDJA' },
  '448': { name: 'Bank Papua', type: 'Regional Development', swiftCode: 'BPAPIDJA' },
  '449': { name: 'Bank Maluku Malut', type: 'Regional Development', swiftCode: 'BMMTIDJA' },
  '450': { name: 'Bank Sumsel Babel', type: 'Regional Development', swiftCode: 'BSLBIDJA' },
  '451': { name: 'Bank Riau Kepri', type: 'Regional Development', swiftCode: 'BRIPIDJA' },
  '452': { name: 'Bank Jambi', type: 'Regional Development', swiftCode: 'BJMIIDJA' },
  '453': { name: 'Bank Aceh', type: 'Regional Development', swiftCode: 'BACHIDJA' },
  '454': { name: 'Bank Sultra', type: 'Regional Development', swiftCode: 'BSTLIDJA' },
  '455': { name: 'Bank Kalteng', type: 'Regional Development', swiftCode: 'BKTLIDJA' },
  '456': { name: 'Bank Kaltimtara', type: 'Regional Development', swiftCode: 'BKTMIDJA' },
  '459': { name: 'Bank BSI', type: 'State-Owned Syariah', swiftCode: 'BSIIIDJA' },
  '466': { name: 'Bank Bukopin', type: 'Private', swiftCode: 'BKPIIDJA' },
  '476': { name: 'Bank BTPN', type: 'Private', swiftCode: 'BTPNIDJA' },
  '484': { name: 'Bank BCA', type: 'Private', swiftCode: 'CENAIDJA' },
  '485': { name: 'Bank Danamon', type: 'Private', swiftCode: 'BDINIDJA' },
  '487': { name: 'Bank Permata', type: 'Private', swiftCode: 'BBBAIDJA' },
  '488': { name: 'Bank Panin', type: 'Private', swiftCode: 'PINBIDJA' },
  '489': { name: 'Bank CIMB Niaga', type: 'Private', swiftCode: 'BNIAIDJA' },
  '490': { name: 'Bank OCBC NISP', type: 'Private', swiftCode: 'NISPIDJA' },
  '491': { name: 'Bank UOB Indonesia', type: 'Private', swiftCode: 'UOBBIDJA' },
  '492': { name: 'Bank Mega', type: 'Private', swiftCode: 'MEGAIDJA' },
  '494': { name: 'Bank Sinarmas', type: 'Private', swiftCode: 'SMBRIDJA' },
  '495': { name: 'Bank Commonwealth', type: 'Private', swiftCode: 'BCOMIDJA' },
  '496': { name: 'Bank Maybank', type: 'Private', swiftCode: 'MBBKIDJA' },
  '497': { name: 'Bank HSBC', type: 'Foreign', swiftCode: 'HSBCIDJA' },
  '498': { name: 'Bank Citibank', type: 'Foreign', swiftCode: 'CITIIDJA' },
  '499': { name: 'Bank DBS', type: 'Private', swiftCode: 'DBSBIDJA' },
  '500': { name: 'Bank Jago', type: 'Digital', swiftCode: 'JAGOIDJA' },
  '501': { name: 'Bank Neo Commerce', type: 'Digital', swiftCode: 'NEOCIDJA' },
  '502': { name: 'Bank Seabank', type: 'Digital', swiftCode: 'SEABIDJA' },
  '503': { name: 'Bank Blu BCA Digital', type: 'Digital', swiftCode: 'BCADIDJA' },
  '504': { name: 'Bank Aladin', type: 'Digital', swiftCode: 'ALADIDJA' },
  '505': { name: 'Bank Allo', type: 'Digital', swiftCode: 'ALLOIDJA' },
  '506': { name: 'Bank Amar', type: 'Digital', swiftCode: 'AMARIDJA' },
  '507': { name: 'Bank Superbank', type: 'Digital', swiftCode: 'SEABIDJA' },
  '508': { name: 'Bank Sahabat Sampoerna', type: 'Private', swiftCode: 'SAMPIDJA' },
  '509': { name: 'Bank MNC', type: 'Private', swiftCode: 'MNCBIDJA' },
  '510': { name: 'Bank Muamalat', type: 'Private Syariah', swiftCode: 'MUABIDJA' },
  '511': { name: 'Bank Victoria', type: 'Private', swiftCode: 'VICTIDJA' },
  '512': { name: 'Bank Panin Dubai', type: 'Private Syariah', swiftCode: 'PDUBIDJA' },
  '513': { name: 'Bank Woori Saudara', type: 'Private', swiftCode: 'WORIIDJA' },
  '514': { name: 'Bank Maspion', type: 'Private', swiftCode: 'MASPIDJA' },
  '515': { name: 'Bank Mestika Dharma', type: 'Private', swiftCode: 'MDRIIDJA' },
  '516': { name: 'Bank Mayora', type: 'Private', swiftCode: 'MYRAIDJA' },
  '517': { name: 'Bank IBK', type: 'Private', swiftCode: 'IBKIIDJA' },
  '518': { name: 'Bank BNI Agro', type: 'Private', swiftCode: 'AGROIDJA' },
  '519': { name: 'Bank CTBC', type: 'Private', swiftCode: 'CTBCIDJA' },
  '520': { name: 'Bank QNB', type: 'Private', swiftCode: 'QNBKIDJA' },
  '521': { name: 'Bank Artha Graha', type: 'Private', swiftCode: 'ARTGIDJA' },
  '522': { name: 'Bank Capital', type: 'Private', swiftCode: 'CPTLIDJA' },
  '523': { name: 'Bank ICBC', type: 'Foreign', swiftCode: 'ICBKIDJA' },
  '524': { name: 'Bank Sinarmas Syariah', type: 'Private Syariah', swiftCode: 'SMSRIDJA' },
  '525': { name: 'Bank Royal', type: 'Private', swiftCode: 'ROYLIDJA' },
  '526': { name: 'Bank Nationalnobu', type: 'Private', swiftCode: 'NOBUIDJA' },
  '527': { name: 'Bank Andara', type: 'Private', swiftCode: 'ANDRIDJA' },
  '528': { name: 'Bank KEB Hana', type: 'Private', swiftCode: 'KOEXIDJA' },
  '529': { name: 'Bank Resona Perdania', type: 'Private', swiftCode: 'RSPRIDJA' },
  '530': { name: 'Bank Mizuho', type: 'Foreign', swiftCode: 'MHCBIDJA' },
  '531': { name: 'Bank Sumitomo Mitsui', type: 'Foreign', swiftCode: 'SMBCIDJA' },
  '532': { name: 'Bank of China', type: 'Foreign', swiftCode: 'BKCHIDJA' },
  '533': { name: 'Standard Chartered', type: 'Foreign', swiftCode: 'SCBLIDJA' },
  '534': { name: 'Bank of India', type: 'Foreign', swiftCode: 'BKIDIDJA' },
  '535': { name: 'Bank BRI Agrin', type: 'State-Owned', swiftCode: 'BRINIDJA' },
  '536': { name: 'Bank Mandiri Taspen', type: 'State-Owned', swiftCode: 'MTSPIDJA' },
  '537': { name: 'Bank Kesejahteraan Ekonomi', type: 'Private', swiftCode: 'BKSEIDJA' },
  '538': { name: 'Bank Sri Parthivi', type: 'Private', swiftCode: 'SRPTIDJA' },
  '542': { name: 'Bank Tabungan Pensiunan Nasional', type: 'Private', swiftCode: 'BTPNIDJA' },
  '547': { name: 'Bank BCA Syariah', type: 'Private Syariah', swiftCode: 'BCASIDJA' },
  '551': { name: 'Bank Permata Syariah', type: 'Private Syariah', swiftCode: 'PRMSIDJA' },
  '553': { name: 'Bank Maybank Syariah', type: 'Private Syariah', swiftCode: 'MBBKIDJA' },
  '555': { name: 'Bank BJB Syariah', type: 'Regional Development Syariah', swiftCode: 'BJBSIDJA' },
  '559': { name: 'Bank Victoria Syariah', type: 'Private Syariah', swiftCode: 'VICSIDJA' },
  '945': { name: 'Bank Mandiri Syariah (BSI)', type: 'State-Owned Syariah', swiftCode: 'BSIIIDJA' },
  '947': { name: 'Bank BNI Syariah (BSI)', type: 'State-Owned Syariah', swiftCode: 'BSIIIDJA' },
  '950': { name: 'Bank BTN Syariah', type: 'State-Owned Syariah', swiftCode: 'BTNSIDJA' },
};

// Common bank name aliases for matching
const BANK_ALIASES: Record<string, string> = {
  'bca': '001',
  'bri': '002',
  'bni': '003',
  'mandiri': '004',
  'danamon': '005',
  'permata': '006',
  'panin': '007',
  'cimb': '008',
  'cimb niaga': '008',
  'ocbc': '009',
  'ocbc nisp': '009',
  'uob': '010',
  'mega': '011',
  'btpn': '012',
  'btn': '013',
  'sinarmas': '014',
  'commonwealth': '015',
  'maybank': '016',
  'hsbc': '017',
  'citibank': '018',
  'jpmorgan': '019',
  'j.p. morgan': '019',
  'dbs': '020',
  'bjb': '021',
  'bsi': '045',
  'syariah indonesia': '045',
  'jago': '116',
  'neo': '117',
  'neo commerce': '117',
  'seabank': '115',
  'blu': '155',
  'aladin': '156',
  'allo': '118',
  'amar': '119',
  'muamalat': '130',
  'bukopin': '133',
  'nobu': '121',
  'maspion': '122',
  'mestika': '123',
  'woori': '114',
  'sampoerna': '153',
  'mnc': '165',
};

function resolveBankInfo(accountNumber: string, bankCode?: string): {
  bank: string;
  type: string;
  swiftCode: string;
  resolvedCode: string;
} {
  if (bankCode) {
    const code = bankCode.trim();
    const info = BANK_CODES[code];
    if (info) {
      return { bank: info.name, type: info.type, swiftCode: info.swiftCode, resolvedCode: code };
    }
    // Try alias
    const aliasCode = BANK_ALIASES[code.toLowerCase()];
    if (aliasCode) {
      const aliasInfo = BANK_CODES[aliasCode];
      if (aliasInfo) {
        return { bank: aliasInfo.name, type: aliasInfo.type, swiftCode: aliasInfo.swiftCode, resolvedCode: aliasCode };
      }
    }
  }

  // Try to infer bank from account number patterns
  // BCA accounts typically start with specific patterns
  const num = accountNumber.replace(/[^0-9]/g, '');

  // Common patterns (simplified)
  if (num.length >= 3) {
    // Check if any bank name appears in the account context
    return { bank: 'Unknown Bank', type: 'Unknown', swiftCode: 'N/A', resolvedCode: bankCode || 'N/A' };
  }

  return { bank: 'Unknown Bank', type: 'Unknown', swiftCode: 'N/A', resolvedCode: bankCode || 'N/A' };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountNumber, bankCode } = body as { accountNumber?: string; bankCode?: string };

    if (!accountNumber || accountNumber.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Account number is required' },
        { status: 400 }
      );
    }

    const account = accountNumber.trim().replace(/[^0-9]/g, '');

    if (account.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Account number must be at least 6 digits' },
        { status: 400 }
      );
    }

    // Resolve bank information
    const bankInfo = resolveBankInfo(account, bankCode);

    // Build search queries for bank account intelligence
    const searchCalls: Array<{ query: string; num?: number }> = [
      { query: `"${account}" bank account fraud scam`, num: 10 },
      { query: `"${account}" rekening penipu`, num: 10 },
      { query: `"${account}" bank transfer report suspicious`, num: 8 },
      { query: `"${bankInfo.bank}" account fraud report blacklist`, num: 8 },
    ];

    // Execute sequential web searches
    const searchResults = await sequentialWebSearch(searchCalls, 800);

    // Parse results
    const fraudData = parseResults(searchResults[0] || []);
    const penipuData = parseResults(searchResults[1] || []);
    const suspiciousData = parseResults(searchResults[2] || []);
    const bankBlacklistData = parseResults(searchResults[3] || []);

    const allResults = [...fraudData, ...penipuData, ...suspiciousData, ...bankBlacklistData];
    const allText = allResults.map((r) => `${r.title} ${r.snippet}`).join(' ').toLowerCase();

    // Determine risk level based on search results
    const fraudKeywords = ['penipu', 'penipuan', 'scam', 'fraud', 'scammer', 'nakal', 'hapus', 'rekening penipu', 'blacklist', 'blocked'];
    const criticalKeywords = ['hack', 'breach', 'stolen', 'dicuri', 'crimeware', 'money laundering', 'pencucian uang'];

    let riskLevel = 'Low';
    let fraudReports = 0;

    const fraudMatches = allResults.filter((r) => {
      const text = `${r.title} ${r.snippet}`.toLowerCase();
      return fraudKeywords.some((k) => text.includes(k));
    });

    const criticalMatches = allResults.filter((r) => {
      const text = `${r.title} ${r.snippet}`.toLowerCase();
      return criticalKeywords.some((k) => text.includes(k));
    });

    fraudReports = fraudMatches.length;

    if (criticalMatches.length > 0) {
      riskLevel = 'Critical';
    } else if (fraudMatches.length > 3) {
      riskLevel = 'High';
    } else if (fraudMatches.length > 1) {
      riskLevel = 'Medium';
    } else if (fraudMatches.length > 0) {
      riskLevel = 'Low-Medium';
    }

    // Build fraud alerts
    const fraudAlerts = [...fraudMatches, ...criticalMatches]
      .filter((r, i, arr) => arr.findIndex((x) => x.url === r.url) === i) // deduplicate
      .slice(0, 10)
      .map((r) => {
        const text = `${r.title} ${r.snippet}`.toLowerCase();
        let severity: 'critical' | 'high' | 'medium' | 'low' = 'medium';
        let type = 'Suspicious Activity';

        if (criticalKeywords.some((k) => text.includes(k))) {
          severity = 'critical';
          type = 'Critical Fraud / Criminal Activity';
        } else if (text.includes('penipu') || text.includes('scam') || text.includes('fraud')) {
          severity = 'high';
          type = 'Fraud / Scam Report';
        } else if (text.includes('blacklist') || text.includes('blocked')) {
          severity = 'high';
          type = 'Blacklisted Account';
        } else if (text.includes('suspicious') || text.includes('mencurigakan')) {
          severity = 'medium';
          type = 'Suspicious Activity';
        } else {
          severity = 'low';
          type = 'General Report';
        }

        return {
          type,
          severity,
          domain: r.domain,
          description: r.snippet.substring(0, 300),
          url: r.url,
        };
      });

    // Build search results summary
    const searchResultsSummary = allResults.slice(0, 12).map((r) => ({
      url: r.url,
      title: r.title,
      snippet: r.snippet,
      domain: r.domain,
      category: fraudMatches.some((f) => f.url === r.url) ? 'Fraud Report' as const
        : criticalMatches.some((c) => c.url === r.url) ? 'Critical Alert' as const
        : 'Search Result' as const,
    }));

    // Comprehensive AI analysis
    const allContext = [
      ...fraudData.slice(0, 4).map((r) => `[FRAUD] ${r.title}: ${r.snippet}`),
      ...penipuData.slice(0, 4).map((r) => `[PENIPU] ${r.title}: ${r.snippet}`),
      ...suspiciousData.slice(0, 3).map((r) => `[SUSPICIOUS] ${r.title}: ${r.snippet}`),
      ...bankBlacklistData.slice(0, 3).map((r) => `[BANK-BLACKLIST] ${r.title}: ${r.snippet}`),
    ].join('\n\n');

    const aiAnalysis = allContext.length > 0
      ? await safeAIAnalysis(
          `OSINT analyst for bank account fraud detection and financial intelligence. Report with: ## 🏦 ACCOUNT OVERVIEW ## ⚠️ FRAUD ASSESSMENT ## 🔍 RISK ANALYSIS ## 🚨 FRAUD ALERTS ## 🛡️ SECURITY RECOMMENDATIONS. Be concise, 2-3 lines per section. Do NOT reveal actual account balances or personal data. Focus on risk indicators and patterns.`,
          `Account: ****${account.slice(-4)} | Bank: ${bankInfo.bank} | Type: ${bankInfo.type} | SWIFT: ${bankInfo.swiftCode}
Risk Level: ${riskLevel} | Fraud Reports: ${fraudReports} | Alerts: ${fraudAlerts.length}

Fraud Intelligence:
${allContext.substring(0, 1500)}`
        )
      : 'No bank account intelligence data available for this account.';

    return NextResponse.json({
      success: true,
      accountNumber: `****${account.slice(-4)}`,
      bankCode: bankInfo.resolvedCode,
      analysis: {
        bank: bankInfo.bank,
        type: bankInfo.type,
        riskLevel,
        fraudReports,
      },
      searchResults: searchResultsSummary,
      fraudAlerts,
      alertCount: fraudAlerts.length,
      aiAnalysis,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
