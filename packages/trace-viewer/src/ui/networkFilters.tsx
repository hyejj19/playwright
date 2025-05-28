/**
 * Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import * as React from 'react';
import './networkFilters.css';
import { ToolbarButton } from '@web/components/toolbarButton';

const resourceTypes = ['All', 'Fetch', 'HTML', 'JS', 'CSS', 'Font', 'Image'] as const;
export type ResourceType = typeof resourceTypes[number];

export type FilterState = {
  searchValue: string;
  resourceType: ResourceType;
};

const NEXT_ITEM_ESTIMATED_WIDTH = 50;

export const defaultFilterState: FilterState = { searchValue: '', resourceType: 'All' };

export const NetworkFilters = ({
  filterState,
  onFilterStateChange,
}: {
  filterState: FilterState;
  onFilterStateChange: (fs: FilterState) => void;
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const tabRefs = React.useRef<(HTMLDivElement | null)[]>([]);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const prevSizeRef = React.useRef<number>(0);

  const [hiddenItems, setHiddenItems] = React.useState<Set<ResourceType>>(new Set());
  const [dropdownOpen, setDropdownOpen] = React.useState(false);

  const stateRef = React.useRef({
    hiddenItems,
    filterState
  });

  React.useEffect(() => {
    stateRef.current = { hiddenItems, filterState };
  }, [hiddenItems, filterState]);

  const visibleItems = resourceTypes.filter(type => !hiddenItems.has(type));
  const overflowItems = resourceTypes.filter(type => hiddenItems.has(type));

  const handleDropdownItemClick = (selectedType: ResourceType) => {
    const lastVisibleItem = visibleItems[visibleItems.length - 1];
    setHiddenItems(prev => {
      const newSet = new Set(prev);
      newSet.delete(selectedType);
      newSet.add(lastVisibleItem);
      return newSet;
    });

    onFilterStateChange({ ...filterState, resourceType: selectedType });
    setDropdownOpen(false);
  };

  const recalc = React.useCallback((isExpanding = false, isShrinking = false) => {
    const container = containerRef.current;

    const currentHiddenItems = stateRef.current.hiddenItems;
    const currentFilterState = stateRef.current.filterState;
    const currentVisibleItems = resourceTypes.filter(type => !currentHiddenItems.has(type));
    const currentOverflowItems = resourceTypes.filter(type => currentHiddenItems.has(type));

    const lastVisibleEl = tabRefs.current[currentVisibleItems.length - 1];

    if (!container || !lastVisibleEl)
      return;

    const containerBox = containerRef.current?.getBoundingClientRect();
    const moreBtnBox =  dropdownRef.current?.getBoundingClientRect();
    const moreBtnWidth = moreBtnBox?.width ?? 40;
    const availableWidth = +(containerBox.width - moreBtnWidth).toFixed(0);
    const curVisibleWidth = lastVisibleEl.getBoundingClientRect().right - containerBox.left;

    if (isShrinking && availableWidth <= curVisibleWidth) {
      const lastVisibleItem = currentVisibleItems[currentVisibleItems.length - 1];
      if (currentVisibleItems.length === 1 && currentFilterState.resourceType === lastVisibleItem)
        return;


      if (currentFilterState.resourceType !== lastVisibleItem) {
        setHiddenItems(prev => new Set([...prev, lastVisibleItem]));
        return;
      }
      if (currentVisibleItems.length > 1) {
        const itemToMove = currentVisibleItems[currentVisibleItems.length - 2];
        setHiddenItems(prev => new Set([...prev, itemToMove]));
        return;
      }
    }

    if (isExpanding && currentHiddenItems.size > 0 && availableWidth > curVisibleWidth) {
      const remainingSpace = availableWidth - curVisibleWidth;
      const nextItemToShow = currentOverflowItems[0];
      if (remainingSpace >= NEXT_ITEM_ESTIMATED_WIDTH) {
        setHiddenItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(nextItemToShow);
          return newSet;
        });
        return;
      }
    }
  }, []);

  React.useEffect(() => {
    recalc();

    const ro = new ResizeObserver(entries => {
      const entry = entries[0];
      const currentWidth = entry.contentRect.width;
      const prevWidth = prevSizeRef.current;

      if (prevWidth === 0) {
        prevSizeRef.current = currentWidth;
        return;
      }

      const isExpanding = currentWidth > prevWidth;
      const isShrinking = currentWidth < prevWidth;

      recalc(isExpanding, isShrinking);

      prevSizeRef.current = currentWidth;
    });

    if (containerRef.current) {
      prevSizeRef.current = containerRef.current.getBoundingClientRect().width;
      ro.observe(containerRef.current);
    }
    return () => ro.disconnect();
  }, [recalc]);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node))
        setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


  return (
    <div className='network-filters' >
      <input
        type='search'
        placeholder='Filter network'
        spellCheck={false}
        value={filterState.searchValue}
        onChange={e =>
          onFilterStateChange({ ...filterState, searchValue: e.target.value })
        }
      />
      <div className='network-filters-resource-types' ref={containerRef}>
        {visibleItems.map((type, idx) => (
          <div
            key={type}
            ref={el => (tabRefs.current[idx] = el)}
            title={type}
            className={`network-filters-resource-type ${
              filterState.resourceType === type ? 'selected' : ''
            }`}
            onClick={() =>
              onFilterStateChange({ ...filterState, resourceType: type })
            }
          >
            {type}
          </div>
        ))}
      </div>
      {overflowItems.length > 0 && (
        <div ref={dropdownRef} className='network-filters-more-button-wrapper'>
          <ToolbarButton
            title='More filters'
            className={`network-filters-more-button ${dropdownOpen ? 'active' : ''}`}
            onClick={() => setDropdownOpen(!dropdownOpen)}
            ariaLabel='More filters'
          >
            <span className='codicon codicon-chevron-right' />
          </ToolbarButton>
          {dropdownOpen && (
            <div className='network-filters-dropdown'>
              {overflowItems.map(type => (
                <div
                  key={type}
                  className={`network-filters-dropdown-item ${
                    filterState.resourceType === type ? 'selected' : ''
                  }`}
                  onClick={() => handleDropdownItemClick(type)}
                >
                  {type}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
