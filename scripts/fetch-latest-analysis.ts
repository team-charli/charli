#!/usr/bin/env bun

// Script to fetch the latest verbatim analysis report from R2 and display with glow
import { $ } from "bun";

async function fetchLatestAnalysis() {
  try {
    console.log("🔍 Fetching latest verbatim analysis from R2...");
    
    // List objects in the verbatim reports bucket, sorted by last modified
    const listResult = await $`aws s3api list-objects-v2 --bucket deepgram-verbatim-qa-reports --query 'Contents | sort_by(@, &LastModified) | [-1]' --output json`.text();
    
    const latestObject = JSON.parse(listResult);
    
    if (!latestObject) {
      console.log("❌ No analysis reports found in R2 bucket");
      process.exit(1);
    }
    
    const objectKey = latestObject.Key;
    const lastModified = latestObject.LastModified;
    const size = latestObject.Size;
    
    console.log(`📄 Latest report: ${objectKey}`);
    console.log(`📅 Last modified: ${lastModified}`);
    console.log(`📊 Size: ${size} bytes`);
    console.log("");
    
    // Download the markdown content
    const content = await $`aws s3 cp s3://deepgram-verbatim-qa-reports/${objectKey} -`.text();
    
    if (!content) {
      console.log("❌ Failed to fetch report content");
      process.exit(1);
    }
    
    console.log("✅ Report fetched successfully! Displaying with glow...");
    console.log("=".repeat(80));
    
    // Create a temporary file and pipe to glow
    const tempFile = `/tmp/verbatim-analysis-${Date.now()}.md`;
    await Bun.write(tempFile, content);
    
    // Display with glow
    await $`glow ${tempFile}`;
    
    // Clean up temp file
    await $`rm ${tempFile}`;
    
  } catch (error) {
    console.error("❌ Error fetching analysis:", error);
    
    // Fallback: check if AWS CLI is configured
    try {
      await $`aws sts get-caller-identity`.quiet();
    } catch {
      console.log("\n💡 Tip: Make sure AWS CLI is configured with R2 credentials:");
      console.log("   aws configure set aws_access_key_id YOUR_R2_ACCESS_KEY");
      console.log("   aws configure set aws_secret_access_key YOUR_R2_SECRET_KEY");
      console.log("   aws configure set region auto");
      console.log("   aws configure set endpoint_url https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com");
    }
    
    process.exit(1);
  }
}

// Check if glow is available
try {
  await $`which glow`.quiet();
} catch {
  console.log("❌ glow not found in PATH");
  console.log("💡 Install with: brew install glow");
  process.exit(1);
}

await fetchLatestAnalysis();