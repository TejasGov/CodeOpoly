export interface Challenge {
  id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: 'arrays' | 'strings' | 'dp' | 'graphs' | 'trees' | 'sql' | 'system-design' | 'linked-lists' | string;
  template: string;
  functionName: string;
  testCases: Array<{
    input: any[];
    expectedOutput: any;
    description?: string;
  }>;
  examples?: Array<{
    input: string;
    output: string;
    explanation?: string;
  }>;
  constraints?: string;
  timeLimit: number; // seconds
  baseReward: number; // money reward
}

export const CHALLENGES: Record<'easy' | 'medium' | 'hard', Challenge[]> = {
  easy: [
    {
      id: 'two-sum',
      title: 'Two Sum',
      description: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
      difficulty: 'easy',
      category: 'arrays',
      template: `function twoSum(nums, target) {
  // Return indices of two numbers that add up to target
  // Example: twoSum([2, 7, 11, 15], 9) => [0, 1]
  
}`,
      functionName: 'twoSum',
      testCases: [
        { input: [[2, 7, 11, 15], 9], expectedOutput: [0, 1] },
        { input: [[3, 2, 4], 6], expectedOutput: [1, 2] },
        { input: [[3, 3], 6], expectedOutput: [0, 1] },
      ],
      examples: [
        { input: 'nums = [2,7,11,15], target = 9', output: '[0,1]', explanation: 'nums[0] + nums[1] = 2 + 7 = 9' },
      ],
      constraints: '2 <= nums.length <= 10^4',
      timeLimit: 30,
      baseReward: 100,
    },
    {
      id: 'valid-parentheses',
      title: 'Valid Parentheses',
      description: 'Given a string s containing just the characters "(", ")", "{", "}", "[" and "]", determine if the input string is valid.',
      difficulty: 'easy',
      category: 'strings',
      template: `function isValid(s) {
  // Return true if parentheses are valid
  // Example: isValid("()[]{}") => true
  
}`,
      functionName: 'isValid',
      testCases: [
        { input: ['()'], expectedOutput: true },
        { input: ['()[]{}'], expectedOutput: true },
        { input: ['(]'], expectedOutput: false },
      ],
      examples: [
        { input: 's = "()"', output: 'true' },
        { input: 's = "(]"', output: 'false' },
      ],
      timeLimit: 30,
      baseReward: 100,
    },
    {
      id: 'reverse-string',
      title: 'Reverse String',
      description: 'Write a function that reverses a string. The input string is given as an array of characters s.',
      difficulty: 'easy',
      category: 'strings',
      template: `function reverseString(s) {
  // Reverse the string in-place
  // Example: reverseString(["h","e","l","l","o"]) => ["o","l","l","e","h"]
  
}`,
      functionName: 'reverseString',
      testCases: [
        { input: [['h', 'e', 'l', 'l', 'o']], expectedOutput: ['o', 'l', 'l', 'e', 'h'] },
        { input: [['H', 'a', 'n', 'n', 'a', 'h']], expectedOutput: ['h', 'a', 'n', 'n', 'a', 'H'] },
      ],
      timeLimit: 20,
      baseReward: 80,
    },
    {
      id: 'contains-duplicate',
      title: 'Contains Duplicate',
      description: 'Given an integer array nums, return true if any value appears at least twice in the array, and return false if every element is distinct.',
      difficulty: 'easy',
      category: 'arrays',
      template: `function containsDuplicate(nums) {
  // Return true if array contains duplicates
  // Example: containsDuplicate([1,2,3,1]) => true
  
}`,
      functionName: 'containsDuplicate',
      testCases: [
        { input: [[1, 2, 3, 1]], expectedOutput: true },
        { input: [[1, 2, 3, 4]], expectedOutput: false },
        { input: [[1, 1, 1, 3, 3, 4, 3, 2, 4, 2]], expectedOutput: true },
      ],
      timeLimit: 25,
      baseReward: 90,
    },
  ],
  
  medium: [
    {
      id: 'longest-substring',
      title: 'Longest Substring Without Repeating Characters',
      description: 'Given a string s, find the length of the longest substring without repeating characters.',
      difficulty: 'medium',
      category: 'strings',
      template: `function lengthOfLongestSubstring(s) {
  // Return length of longest substring without repeating chars
  // Example: lengthOfLongestSubstring("abcabcbb") => 3
  
}`,
      functionName: 'lengthOfLongestSubstring',
      testCases: [
        { input: ['abcabcbb'], expectedOutput: 3 },
        { input: ['bbbbb'], expectedOutput: 1 },
        { input: ['pwwkew'], expectedOutput: 3 },
      ],
      examples: [
        { input: 's = "abcabcbb"', output: '3', explanation: 'The answer is "abc", with the length of 3.' },
      ],
      timeLimit: 45,
      baseReward: 200,
    },
    {
      id: 'container-with-most-water',
      title: 'Container With Most Water',
      description: 'You are given an integer array height of length n. Find two lines that together with the x-axis form a container, such that the container contains the most water.',
      difficulty: 'medium',
      category: 'arrays',
      template: `function maxArea(height) {
  // Return maximum area of water container
  // Example: maxArea([1,8,6,2,5,4,8,3,7]) => 49
  
}`,
      functionName: 'maxArea',
      testCases: [
        { input: [[1, 8, 6, 2, 5, 4, 8, 3, 7]], expectedOutput: 49 },
        { input: [[1, 1]], expectedOutput: 1 },
      ],
      timeLimit: 40,
      baseReward: 180,
    },
    {
      id: 'three-sum',
      title: '3Sum',
      description: 'Given an integer array nums, return all the triplets [nums[i], nums[j], nums[k]] such that i != j, i != k, and j != k, and nums[i] + nums[j] + nums[k] == 0.',
      difficulty: 'medium',
      category: 'arrays',
      template: `function threeSum(nums) {
  // Return all triplets that sum to zero
  // Example: threeSum([-1,0,1,2,-1,-4]) => [[-1,-1,2],[-1,0,1]]
  
}`,
      functionName: 'threeSum',
      testCases: [
        { input: [[-1, 0, 1, 2, -1, -4]], expectedOutput: [[-1, -1, 2], [-1, 0, 1]] },
        { input: [[0, 1, 1]], expectedOutput: [] },
        { input: [[0, 0, 0]], expectedOutput: [[0, 0, 0]] },
      ],
      timeLimit: 50,
      baseReward: 220,
    },
  ],
  
  hard: [
    {
      id: 'median-two-arrays',
      title: 'Median of Two Sorted Arrays',
      description: 'Given two sorted arrays nums1 and nums2 of size m and n respectively, return the median of the two sorted arrays.',
      difficulty: 'hard',
      category: 'arrays',
      template: `function findMedianSortedArrays(nums1, nums2) {
  // Return median of two sorted arrays
  // Example: findMedianSortedArrays([1,3], [2]) => 2.0
  
}`,
      functionName: 'findMedianSortedArrays',
      testCases: [
        { input: [[1, 3], [2]], expectedOutput: 2.0 },
        { input: [[1, 2], [3, 4]], expectedOutput: 2.5 },
      ],
      timeLimit: 60,
      baseReward: 400,
    },
    {
      id: 'merge-k-sorted-lists',
      title: 'Merge k Sorted Lists',
      description: 'You are given an array of k linked-lists lists, each linked-list is sorted in ascending order. Merge all the linked-lists into one sorted linked-list and return it.',
      difficulty: 'hard',
      category: 'linked-lists',
      template: `function mergeKLists(lists) {
  // Merge k sorted linked lists
  // Return merged sorted list
  
}`,
      functionName: 'mergeKLists',
      testCases: [
        { input: [[[1, 4, 5], [1, 3, 4], [2, 6]]], expectedOutput: [1, 1, 2, 3, 4, 4, 5, 6] },
        { input: [[]], expectedOutput: [] },
      ],
      timeLimit: 60,
      baseReward: 450,
    },
    {
      id: 'trapping-rain-water',
      title: 'Trapping Rain Water',
      description: 'Given n non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.',
      difficulty: 'hard',
      category: 'arrays',
      template: `function trap(height) {
  // Return total trapped rainwater
  // Example: trap([0,1,0,2,1,0,1,3,2,1,2,1]) => 6
  
}`,
      functionName: 'trap',
      testCases: [
        { input: [[0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]], expectedOutput: 6 },
        { input: [[4, 2, 0, 3, 2, 5]], expectedOutput: 9 },
      ],
      timeLimit: 55,
      baseReward: 420,
    },
  ],
};

// Helper to get random challenge by difficulty
export const getRandomChallenge = (difficulty: 'easy' | 'medium' | 'hard'): Challenge => {
  const challenges = CHALLENGES[difficulty];
  return challenges[Math.floor(Math.random() * challenges.length)];
};

// Helper to get challenge by ID
export const getChallengeById = (id: string): Challenge | undefined => {
  for (const difficulty of ['easy', 'medium', 'hard'] as const) {
    const challenge = CHALLENGES[difficulty].find(c => c.id === id);
    if (challenge) return challenge;
  }
  return undefined;
};

