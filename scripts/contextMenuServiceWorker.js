const getKey = () => {
  return new Promise((resolve, reject) => {
    console.log('Trying to get the key')
    chrome.storage.local.get(['openai-key'], (result) => {
      if (result['openai-key']) {
        const decodedKey = atob(result['openai-key']);
        console.log('We got the key')
        resolve(decodedKey);
      }
    });
  });
};

const sendMessage = (content) => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs[0].id;

    chrome.tabs.sendMessage(
      activeTab,
      { message: 'inject', content },
      (response) => {
        if (response && response.status === 'failed') {
          console.log(response.body);
          console.log(`injection failed`);
        }
      }
    );
  });
};

const generate = async (prompt) => {
  // Get your API key from storage
  const key = await getKey();
  const url = 'https://api.openai.com/v1/completions';

  // Call completions endpoint
  const completionResponse = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: 'text-davinci-003',
      prompt: prompt,
      max_tokens: 1250,
      temperature: 0.7,
    }),
  });

  // Select the top choice and send back
  const completion = await completionResponse.json();
  return completion.choices.pop();
}


const generateCompletionAction = async (info) => {
  try {
    // Send mesage with generating text (this will be like a loading indicator)
    sendMessage('generating...');

    const { selectionText } = info;
    const basePrompt = `
    Add the specifications fro the following user story

	  Title: ${selectionText}

    Specifications:
	`;

  const baseCompletion = await generate(`${basePrompt}`);

  // Let's see what we get!
  console.log(baseCompletion.text)

  // Add your second prompt here
  const secondPrompt = `
  Add precise acceptance criteria for the developers to be able to implement the user tory

  Title: ${selectionText}

  Specifications: ${baseCompletion.text}

  Acceptance criteria:
  `;

// Call your second prompt
  const secondPromptCompletion = await generate(secondPrompt);

  const finalCompletion =
  `
  Title: ${selectionText}

  Specifications: ${baseCompletion.text}

  Acceptance criteria: ${secondPromptCompletion.text}
  `
  console.log(finalCompletion)

  sendMessage(finalCompletion);
  } catch (error) {
    console.log(error);
  }
};

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'context-run',
    title: 'Generate user story',
    contexts: ['selection'],
  });
});

// Add listener
chrome.contextMenus.onClicked.addListener(generateCompletionAction);
