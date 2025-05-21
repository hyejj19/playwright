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

export const defaultFilterState: FilterState = { searchValue: '', resourceType: 'All' };

// TODO:
// 1. 하단으로 이동시켰다가 다시 돌아올 때 탭 아이템 일부 중복되는 현상 수정
// 2. resize 줄어들 때 moreButton이 오른쪽으로 밀려서 사라지는 현상 수정
// 3. 현재 선택된 탭인 경우 dropdown 에 넣지 않도록 수정
// 4. 현재 선택된 탭이면서 왼쪽에 아이템이 있는 경우, 좌측 아이템을 넣도록 수정
// 5. 드롭다운에서 탭 선택시, 가장 마지막에 있는 visible Item 과 switch 되도록 수정

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

  const [visible, setVisible] = React.useState<ResourceType[]>([...resourceTypes]);
  const [overflows, setOverflows] = React.useState<ResourceType[]>([]);
  const [dropdownOpen, setDropdownOpen] = React.useState(false);


  const recalc = React.useCallback(() => {
    const containerElement = containerRef.current;

    if (!containerElement)
      return;

    const containerRect = containerRef.current?.getBoundingClientRect();
    const moreButtonRect =  dropdownRef.current?.getBoundingClientRect();
    const availableWidthForAllVisibleItems = containerRect.width - (moreButtonRect?.width ?? 0);

    // --- 로직 1: 아이템을 'visible'에서 'overflows'로 이동 ---
    if (visible.length > 0) {
      const lastVisibleItemElement = tabRefs.current[visible.length - 1];

      if (lastVisibleItemElement) {
        const totalWidthOfVisibleItems = lastVisibleItemElement.getBoundingClientRect().right - containerRect.left;

        if (totalWidthOfVisibleItems > availableWidthForAllVisibleItems) {
          const itemToMove = visible[visible.length - 1];
          setVisible(prev => prev.slice(0, -1));
          setOverflows(prev => [...prev, itemToMove]);
          return;
        }
      }
    }

    // --- 로직 2: 아이템을 'overflows'에서 'visible'로 다시 이동 ---
    if (overflows.length > 0) {
      let totalWidthOfCurrentVisibleItems = 0;
      if (visible.length > 0) {
        const lastVisibleItemElement = tabRefs.current[visible.length - 1];
        if (lastVisibleItemElement)
          totalWidthOfCurrentVisibleItems = lastVisibleItemElement.getBoundingClientRect().right - containerRect.left;
      }

      const NEXT_ITEM_ESTIMATED_WIDTH = 50;

      if (totalWidthOfCurrentVisibleItems + NEXT_ITEM_ESTIMATED_WIDTH <= availableWidthForAllVisibleItems) {
        const itemToMoveBack = overflows[overflows.length - 1];
        setVisible(prev => [...prev, itemToMoveBack]);
        setOverflows(prev => prev.slice(0, -1));
        return;
      }
    }
  }, [visible, overflows]);

  React.useEffect(() => {
    recalc();
    const ro = new ResizeObserver(() => {
      recalc();
    });

    if (containerRef.current)
      ro.observe(containerRef.current);

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
        {visible.map((type, idx) => (
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
        {!!overflows.length && (
          <div ref={dropdownRef} className='network-filters-more-button-wrapper'>
            <ToolbarButton
              title='More filters'
              className={`network-filters-more-button ${dropdownOpen ? 'active' : ''}`}
              onClick={() => setDropdownOpen(!dropdownOpen)}
              ariaLabel='More filters'
            >
                ...
            </ToolbarButton>
            {dropdownOpen && (
              <div className='network-filters-dropdown'>
                {overflows.map(type => (
                  <div
                    key={type}
                    className={`network-filters-dropdown-item ${
                      filterState.resourceType === type ? 'selected' : ''
                    }`}
                    onClick={() => {
                      onFilterStateChange({ ...filterState, resourceType: type });
                      setDropdownOpen(false);
                    }}
                  >
                    {type}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
