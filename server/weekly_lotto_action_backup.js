const fs = require("fs");
const path = require("path");
const axios = require("axios");
const fetch = require("node-fetch");

const { Octokit } = require("@octokit/core");

const userName = "bloodstrawberry";
const userEmail = "vvv3334@hanmail.net";
const repo = "lotto-viewer";
const token = process.env.GH_TOKEN;

const getSHA = async (octokit, path) => {
  const response = await octokit.request(
    `GET /repos/${userName}/${repo}/contents/${path}`
  );

  return response.data.sha;
};

const githubWrite = async (path, contents, commitMessage) => {
  const octokit = new Octokit({
    auth: token,
    request: {
      fetch: fetch,
    },
  });

  const fileSHA = await getSHA(octokit, path);

  const response = await octokit.request(
    `PUT /repos/${userName}/${repo}/contents/${path}`,
    {
      sha: fileSHA,
      message: commitMessage,
      committer: {
        name: userName,
        email: userEmail,
      },

      // btoa : 바이너리 데이터를 base64로 인코딩
      // unescape(encodeURIComponent(())) <- 한글 처리
      content: btoa(unescape(encodeURIComponent(`${contents}`))),
    }
  );

  console.log(response.status);
};

const getLottoNumber = async (drwNo) => {
  try {
    const response = await axios.get(
      `https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo=${drwNo}`
    );

    if (response.status !== 200) return undefined;

    return response.data;
  } catch (error) {
    console.error(`Error fetching round ${drwNo}:`, error.message);
    return undefined;
  }
};

const saveLog = async (drwNo) => {
    try {
    const response = await axios.get(
      `https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo=${drwNo}`
    );

    if (response.status !== 200) return undefined;

    const githubFilePath = "server/lotto_log.txt";
    await githubWrite(githubFilePath, response.data, `Update lotto_log.txt`); 

    return response.data;
  } catch (error) {
    console.error(`Error fetching round ${drwNo}:`, error.message);
    return undefined;
  }
}

const getLottoRound = (date) => {
  const baseDate = new Date('2002-12-07T00:00:00');
  const targetDate = new Date(date);
  
  // Reset time to ensure day calculation is accurate
  targetDate.setHours(0, 0, 0, 0);
  baseDate.setHours(0, 0, 0, 0);

  const diffTime = targetDate - baseDate;
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  
  if (diffDays < 0) return 0;
  
  const round = Math.ceil(diffDays / 7) + 1;
  return round;
};

const updateLottoJson = async (targetDateStr) => {
  const filePath = path.join(__dirname, "../json/lottoNumber.json");

  console.log("filePath :", filePath);

  try {
    const data = fs.readFileSync(filePath, "utf-8");
    const lottoJson = JSON.parse(data);
    const lastEntry = lottoJson[lottoJson.length - 1];
    const lastDrwNo = lastEntry ? lastEntry.drwNo : 0;
    
    const targetDate = targetDateStr ? new Date(targetDateStr) : new Date();
    const targetRound = getLottoRound(targetDate);

    console.log(`Last Round: ${lastDrwNo}, Target Round: ${targetRound} (Target Date: ${targetDateStr || 'Today'})`);

    console.log("saveLog start");
    saveLog(lastDrwNo);
    console.log("saveLog end");
    
    // 최신 회차부터 3회차 전까지의 데이터를 갱신 (정보가 변경될 수 있음)
    if (lastDrwNo > 0) {
      const refreshStart = Math.max(1, lastDrwNo - 2); // 최신 회차부터 3회차 전까지 (최소 1회차)
      console.log(`Refreshing rounds ${refreshStart} to ${lastDrwNo}...`);
      
      for (let i = refreshStart; i <= lastDrwNo; i++) {
        console.log(`Refreshing round ${i}...`);
        const lottoData = await getLottoNumber(i);
        
        if (lottoData && lottoData.returnValue === 'success') {
          // 기존 데이터를 찾아서 업데이트
          const existingIndex = lottoJson.findIndex(item => item.drwNo === i);
          if (existingIndex !== -1) {
            lottoJson[existingIndex] = lottoData;
            console.log(`Updated round ${i}`);
          }
        } else {
          console.log(`Failed to refresh round ${i}`);
        }
      }
    }

    if (targetRound <= lastDrwNo) {
      console.log("Already up to date.");
      // 갱신만 했으므로 계속 진행하여 저장
    } else {
      // 새로운 회차 추가
      for (let i = lastDrwNo + 1; i <= targetRound; i++) {
        console.log(`Fetching round ${i}...`);
        const lottoData = await getLottoNumber(i);
        
        if (lottoData && lottoData.returnValue === 'success') {
          lottoJson.push(lottoData);
        } else {
          console.log(`Failed to fetch round ${i} or data not available yet.`);
          // If we fail to fetch, we might want to stop to avoid gaps, or continue?
          // Usually if one fails, subsequent might fail too if it's future.
          // But if it's a network error, we might want to retry.
          // For now, break is safer to avoid gaps.
          break; 
        }
      }
    }

    // fs.writeFileSync(filePath, JSON.stringify(lottoJson, null, 4));

    const updatedJson = JSON.stringify(lottoJson, null, 2);
    
    const today = new Date();
    const formatted = today.toISOString().split("T")[0];

    const githubFilePath = "json/lottoNumber.json";

    console.log("githubFilePath :", githubFilePath);
    githubWrite(githubFilePath, updatedJson, `${formatted} Update lottoNumber.json`); 

    console.log("Update complete.");
  } catch (error) {
    console.error("Error updating lotto json:", error);
  }
};

// Execute if run directly
if (require.main === module) {
    // Check for command line argument or use default (undefined -> Today)
    const argDate = process.argv[2];
    updateLottoJson(argDate);
}

