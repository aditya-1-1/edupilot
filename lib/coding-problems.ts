export type PracticeLanguage = 'python' | 'cpp'

export type CodingProblem = {
  id: string
  title: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  topics: string[]
  description: string
  examples: string
  constraints?: string
  starterPython: string
  starterCpp: string
}

export const CODING_PRACTICE_SESSION = 'coding-practice'

export function getStarterCode(p: CodingProblem, lang: PracticeLanguage): string {
  return lang === 'python' ? p.starterPython : p.starterCpp
}

export const CODING_PROBLEMS: CodingProblem[] = [
  {
    id: 'two-sum',
    title: 'Two Sum',
    difficulty: 'Easy',
    topics: ['Arrays', 'Hash Table'],
    description:
      'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume each input has exactly one solution and you may not use the same element twice.',
    examples:
      'Input: nums = [2,7,11,15], target = 9\nOutput: [0,1]\nExplanation: nums[0] + nums[1] = 2 + 7 = 9.',
    constraints: '2 ≤ nums.length ≤ 10^4, -10^9 ≤ nums[i], target ≤ 10^9',
    starterPython: `def two_sum(nums: list[int], target: int) -> list[int]:
    # Your code
    return []`,
    starterCpp: `#include <vector>
using namespace std;

vector<int> twoSum(vector<int>& nums, int target) {
    // Your code
    return {};
}`,
  },
  {
    id: 'valid-parentheses',
    title: 'Valid Parentheses',
    difficulty: 'Easy',
    topics: ['Stack', 'String'],
    description:
      'Given a string s containing just the characters "(", ")", "{", "}", "[" and "]", determine if the input string is valid. Open brackets must be closed by the same type in correct order.',
    examples: 'Input: s = "()[]{}"\nOutput: true',
    starterPython: `def is_valid(s: str) -> bool:
    # Your code
    return False`,
    starterCpp: `#include <string>
using namespace std;

bool isValid(string s) {
    // Your code
    return false;
}`,
  },
  {
    id: 'max-subarray',
    title: 'Maximum Subarray (Kadane)',
    difficulty: 'Medium',
    topics: ['Arrays', 'Dynamic Programming'],
    description:
      'Given an integer array nums, find the subarray with the largest sum and return its sum.',
    examples: 'Input: nums = [-2,1,-3,4,-1,2,1,-5,4]\nOutput: 6 (subarray [4,-1,2,1])',
    starterPython: `def max_subarray(nums: list[int]) -> int:
    # Your code
    return 0`,
    starterCpp: `#include <vector>
using namespace std;

int maxSubArray(vector<int>& nums) {
    // Your code
    return 0;
}`,
  },
  {
    id: 'climbing-stairs',
    title: 'Climbing Stairs',
    difficulty: 'Easy',
    topics: ['Dynamic Programming', 'Recursion'],
    description:
      'You are climbing a staircase. It takes n steps to reach the top. Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?',
    examples: 'Input: n = 3\nOutput: 3  (1+1+1, 1+2, 2+1)',
    starterPython: `def climb_stairs(n: int) -> int:
    # Your code
    return 0`,
    starterCpp: `int climbStairs(int n) {
    // Your code
    return 0;
}`,
  },
]

export function getProblemById(id: string): CodingProblem | undefined {
  return CODING_PROBLEMS.find((p) => p.id === id)
}
