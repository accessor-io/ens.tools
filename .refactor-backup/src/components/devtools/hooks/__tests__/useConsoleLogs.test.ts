import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useConsoleLogs } from '../useConsoleLogs';

describe('useConsoleLogs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with empty logs', () => {
    const { result } = renderHook(() => useConsoleLogs());
    
    expect(result.current.consoleLogs).toEqual([]);
    expect(result.current.filteredLogs).toEqual([]);
  });

  it('should add console logs', () => {
    const { result } = renderHook(() => useConsoleLogs());
    
    act(() => {
      result.current.addConsoleLog('log', 'Test message');
    });
    
    expect(result.current.consoleLogs).toHaveLength(1);
    expect(result.current.consoleLogs[0].message).toBe('Test message');
    expect(result.current.consoleLogs[0].type).toBe('log');
  });

  it('should filter logs by type', () => {
    const { result } = renderHook(() => useConsoleLogs());
    
    act(() => {
      result.current.addConsoleLog('log', 'Log message');
      result.current.addConsoleLog('error', 'Error message');
      result.current.setFilterType('error');
    });
    
    expect(result.current.filteredLogs).toHaveLength(1);
    expect(result.current.filteredLogs[0].type).toBe('error');
  });

  it('should filter logs by search query', () => {
    const { result } = renderHook(() => useConsoleLogs());
    
    act(() => {
      result.current.addConsoleLog('log', 'First message');
      result.current.addConsoleLog('log', 'Second message');
      result.current.setSearchQuery('First');
    });
    
    expect(result.current.filteredLogs).toHaveLength(1);
    expect(result.current.filteredLogs[0].message).toBe('First message');
  });

  it('should clear console logs', () => {
    const { result } = renderHook(() => useConsoleLogs());
    
    act(() => {
      result.current.addConsoleLog('log', 'Test message');
      result.current.clearConsole();
    });
    
    expect(result.current.consoleLogs).toHaveLength(0);
  });
});


