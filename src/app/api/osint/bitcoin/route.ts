import { NextRequest, NextResponse } from 'next/server';
import { safeWebSearch, safeAIAnalysis, sequentialWebSearch } from '@/lib/zai';

// Bitcoin address format validation
// P2PKH: starts with 1, 25-34 chars, base58
// P2SH: starts with 3, 25-34 chars, base58
// Bech32: starts with bc1, 42-62 chars, lowercase alphanumeric
const BTC_P2PKH_REGEX = /^1[A-HJ-NP-Za-km-z]{25,34}$/;
const BTC_P2SH_REGEX = /^3[A-HJ-NP-Za-km-z]{25,34}$/;
const BTC_BECH32_REGEX = /^bc1[a-z0-9]{39,59}$/;

function validateBitcoinAddress(address: string): { valid: boolean; addressType: string } {
  const trimmed = address.trim();

  if (BTC_P2PKH_REGEX.test(trimmed)) {
    return { valid: true, addressType: 'P2PKH (Legacy)' };
  }
  if (BTC_P2SH_REGEX.test(trimmed)) {
    return { valid: true, addressType: 'P2SH (SegWit Compatible)' };
  }
  if (BTC_BECH32_REGEX.test(trimmed)) {
    return { valid: true, addressType: 'Bech32 (Native SegWit)' };
  }

  return { valid: false, addressType: 'Unknown' };
}

export async function POST(request: NextRequest) {
  try {
    const { address } = await request.json();

    if (!address) {
      return NextResponse.json(
        { success: false, error: 'Bitcoin address is required' },
        { status: 400 }
      );
    }

    const trimmedAddress = address.trim();
    const validation = validateBitcoinAddress(trimmedAddress);

    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid Bitcoin address format. Bitcoin addresses start with 1, 3, or bc1.',
        },
        { status: 400 }
      );
    }

    const { addressType } = validation;

    // Sequential web searches to avoid rate limiting
    const [
      blockchainResults,
      transactionResults,
      walletResults,
      exchangeResults,
      riskResults,
      darknetResults,
    ] = await sequentialWebSearch([
      // Search for address on blockchain explorers
      { query: `"${trimmedAddress}" bitcoin blockchain explorer balance transactions`, num: 10 },
      // Search for associated transactions
      { query: `"${trimmedAddress}" bitcoin transaction history sent received volume`, num: 10 },
      // Search for associated wallets and clusters
      { query: `"${trimmedAddress}" bitcoin wallet cluster associated addresses`, num: 8 },
      // Search for exchange connections
      { query: `"${trimmedAddress}" bitcoin exchange deposit withdrawal Binance Coinbase Kraken`, num: 8 },
      // Search for risk/sanctions/OFAC
      { query: `"${trimmedAddress}" bitcoin risk sanction OFAC AML fraud scam illicit`, num: 10 },
      // Search for darknet/criminal activity
      { query: `"${trimmedAddress}" bitcoin darknet marketplace ransomware mixer tumbler crime`, num: 10 },
    ], 2000);

    // Parse search results into uniform format
    const parseResults = (results: unknown[]) => {
      return (results as Array<Record<string, string>>).map((r) => ({
        url: r.url || '',
        title: r.name || '',
        snippet: r.snippet || '',
        source: r.host_name || '',
      })).filter((r) => r.title || r.snippet);
    };

    const blockchainData = parseResults(blockchainResults);
    const transactionData = parseResults(transactionResults);
    const walletData = parseResults(walletResults);
    const exchangeData = parseResults(exchangeResults);
    const riskData = parseResults(riskResults);
    const darknetData = parseResults(darknetResults);

    // ====== RISK ASSESSMENT ======
    const riskText = [...riskData, ...darknetData]
      .map((r) => `${r.title} ${r.snippet}`)
      .join(' ')
      .toLowerCase();

    const riskIndicators: Array<{ indicator: string; severity: 'critical' | 'high' | 'medium' | 'low'; category: string }> = [];

    // Critical risk indicators
    const criticalPatterns = [
      { pattern: 'ransomware', category: 'Ransomware' },
      { pattern: 'ofac', category: 'Sanctions (OFAC)' },
      { pattern: 'sanctioned', category: 'Sanctions' },
      { pattern: 'terrorism', category: 'Terrorism Financing' },
      { pattern: 'child abuse', category: 'CSAM' },
      { pattern: 'darknet market', category: 'Darknet Market' },
      { pattern: 'silk road', category: 'Darknet Market' },
    ];

    const highPatterns = [
      { pattern: 'mixer', category: 'Mixer/Tumbler' },
      { pattern: 'tumbler', category: 'Mixer/Tumbler' },
      { pattern: 'money laundering', category: 'Money Laundering' },
      { pattern: 'scam', category: 'Scam/Fraud' },
      { pattern: 'fraud', category: 'Scam/Fraud' },
      { pattern: 'phishing', category: 'Phishing' },
      { pattern: 'hacking', category: 'Hacking' },
      { pattern: 'stolen', category: 'Stolen Funds' },
      { pattern: 'ponzi', category: 'Ponzi Scheme' },
    ];

    const mediumPatterns = [
      { pattern: 'gambling', category: 'Gambling' },
      { pattern: 'darknet', category: 'Darknet Association' },
      { pattern: 'illicit', category: 'Illicit Activity' },
      { pattern: 'high risk', category: 'High Risk' },
      { pattern: 'suspicious', category: 'Suspicious Activity' },
    ];

    for (const p of criticalPatterns) {
      if (riskText.includes(p.pattern)) {
        riskIndicators.push({ indicator: p.pattern, severity: 'critical', category: p.category });
      }
    }

    for (const p of highPatterns) {
      if (riskText.includes(p.pattern)) {
        riskIndicators.push({ indicator: p.pattern, severity: 'high', category: p.category });
      }
    }

    for (const p of mediumPatterns) {
      if (riskText.includes(p.pattern)) {
        riskIndicators.push({ indicator: p.pattern, severity: 'medium', category: p.category });
      }
    }

    // Determine overall risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (riskIndicators.some(r => r.severity === 'critical')) riskLevel = 'critical';
    else if (riskIndicators.some(r => r.severity === 'high')) riskLevel = 'high';
    else if (riskIndicators.some(r => r.severity === 'medium')) riskLevel = 'medium';

    // ====== EXCHANGE DETECTION ======
    const exchangeKeywords = ['binance', 'coinbase', 'kraken', 'huobi', 'okx', 'bybit', 'gate.io', 'bitfinex', 'bitstamp', 'gemini', 'kucoin', 'crypto.com', 'bittrex', 'poloniex'];
    const detectedExchanges = exchangeKeywords.filter(ex =>
      exchangeData.some(r =>
        `${r.title} ${r.snippet} ${r.source}`.toLowerCase().includes(ex)
      ) ||
      riskText.includes(ex)
    );

    // ====== BLOCKCHAIN EXPLORER RESULTS ======
    const explorerDomains = ['blockchain.com', 'blockstream.info', 'mempool.space', 'blockchair.com', 'btc.com', 'blockcypher.com', 'oxt.me'];
    const explorerResults = blockchainData.filter(r =>
      explorerDomains.some(domain => r.source.toLowerCase().includes(domain) || r.url.toLowerCase().includes(domain))
    );

    // ====== WALLET CLUSTER RESULTS ======
    const walletClusterResults = walletData.filter(r =>
      `${r.title} ${r.snippet}`.toLowerCase().includes('wallet') ||
      `${r.title} ${r.snippet}`.toLowerCase().includes('cluster') ||
      `${r.title} ${r.snippet}`.toLowerCase().includes('address')
    );

    // Comprehensive AI analysis
    const allContext = [
      ...blockchainData.slice(0, 4).map((r) => `[BLOCKCHAIN] ${r.title}: ${r.snippet}`),
      ...transactionData.slice(0, 3).map((r) => `[TRANSACTION] ${r.title}: ${r.snippet}`),
      ...walletData.slice(0, 3).map((r) => `[WALLET] ${r.title}: ${r.snippet}`),
      ...exchangeData.slice(0, 3).map((r) => `[EXCHANGE] ${r.title}: ${r.snippet}`),
      ...riskData.slice(0, 3).map((r) => `[RISK] ${r.title}: ${r.snippet}`),
      ...darknetData.slice(0, 3).map((r) => `[DARKNET] ${r.title}: ${r.snippet}`),
    ].join('\n\n');

    const aiAnalysis = allContext.length > 0
      ? await safeAIAnalysis(
          `You are an elite OSINT analyst specializing in cryptocurrency intelligence and blockchain forensics (like Chainalysis or Elliptic).
Analyze the Bitcoin address data and provide a COMPREHENSIVE structured intelligence report with these sections:

## 📋 ADDRESS ANALYSIS
- Bitcoin address type and format breakdown
- Address derivation method (Legacy/SegWit/Native SegWit)
- Address characteristics and usage patterns
- First seen and activity timeline

## 💰 TRANSACTION INTELLIGENCE
- Transaction volume and frequency analysis
- Total received and sent amounts (if available)
- Transaction patterns (regular, sporadic, one-time)
- Fee analysis and timing patterns
- UTXO management behavior

## 🔗 WALLET & CLUSTER INTELLIGENCE
- Associated wallet addresses and clusters
- Co-spending patterns and change address analysis
- Wallet type identification (exchange, personal, service)
- Address reuse behavior

## 🏦 EXCHANGE & SERVICE CONNECTIONS
- Known exchange associations
- Deposit/withdrawal patterns to exchanges
- Service provider connections
- Payment processor usage

## ⚠️ RISK ASSESSMENT
- Overall risk level (LOW/MEDIUM/HIGH/CRITICAL)
- Sanctions screening results (OFAC, EU, UN)
- AML/KYC concerns
- Association with illicit activities
- Darknet marketplace connections
- Mixer/tumbler usage indicators
- Ransomware connections
- Fraud and scam associations

## 🔍 BLOCKCHAIN FORENSICS
- Transaction graph analysis hints
- Flow of funds tracing
- Source of funds assessment
- Destination analysis

## 🔐 SECURITY & COMPLIANCE
- Address reputation score
- Compliance considerations
- Regulatory risk factors
- Recommended due diligence steps

## 🎯 INVESTIGATION RECOMMENDATIONS
- Further blockchain analysis steps
- Additional OSINT techniques
- Cross-chain analysis suggestions
- Legal and compliance recommendations

Be thorough and specific. Include all findings from the data. Use emojis for section headers. Note that this is for authorized security research and compliance purposes only.`,
          `Analyze Bitcoin address: ${trimmedAddress}
Address Type: ${addressType}
Risk Level: ${riskLevel}
Risk Indicators: ${riskIndicators.map(r => `${r.category} (${r.severity})`).join(', ') || 'None detected'}
Detected Exchanges: ${detectedExchanges.join(', ') || 'None detected'}

Intelligence data:
${allContext}

Provide a complete Bitcoin address OSINT intelligence report.`
        )
      : 'No intelligence data available for this Bitcoin address.';

    return NextResponse.json({
      success: true,
      address: trimmedAddress,
      addressType,
      searchResults: [
        ...blockchainData.slice(0, 5).map((r) => ({ ...r, category: 'Blockchain Explorer' })),
        ...explorerResults.slice(0, 3).map((r) => ({ ...r, category: 'Explorer Detail' })),
      ],
      transactionResults: transactionData.slice(0, 10),
      riskResults: {
        riskLevel,
        riskIndicators,
        detectedExchanges,
        riskDetails: riskData.slice(0, 5),
        darknetDetails: darknetData.slice(0, 5),
      },
      walletResults: walletClusterResults.slice(0, 5),
      exchangeResults: exchangeData.slice(0, 5),
      aiAnalysis,
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
