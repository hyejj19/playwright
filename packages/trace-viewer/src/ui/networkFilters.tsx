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


  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node))
        setDropdownOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const recalc = React.useCallback(() => {
    const containerElement = containerRef.current;
    const moreButtonContainerElement = dropdownRef.current; // "..." 버튼을 감싸는 div

    if (!containerElement)
      return;

    const containerRect = containerElement.getBoundingClientRect();
    const gap = 8; // .network-filters-resource-types에 정의된 CSS gap 값

    let moreButtonActualWidth = 0;
    if (moreButtonContainerElement && overflows.length > 0) {
      // display:none 상태일 수 있으므로, 실제 너비를 가져오려면 일시적으로 보이게 할 수도 있지만,
      // 여기서는 overflows.length > 0일때는 항상 DOM에 있고 너비가 있다고 가정합니다.
      moreButtonActualWidth = moreButtonContainerElement.getBoundingClientRect().width;
    }

    // "..." 버튼 영역이 실제로 차지하는 너비 (버튼 너비 + 버튼 앞 간격)
    let moreButtonAreaEffectiveWidth = 0;
    if (overflows.length > 0) { // "..." 버튼이 현재 표시되고 있다면
      moreButtonAreaEffectiveWidth = moreButtonActualWidth;
      if (visible.length > 0) { // 보이는 필터 아이템이 있다면 버튼 앞에 gap이 추가됨
        moreButtonAreaEffectiveWidth += gap;
      }
    }
    // overflows.length가 0이면, "..." 버튼은 공간을 차지하지 않음

    // 보이는 필터 아이템들이 사용할 수 있는 전체 너비
    const availableWidthForAllVisibleItems = containerRect.width - moreButtonAreaEffectiveWidth;

    // --- 로직 1: 아이템을 'visible'에서 'overflows'로 이동 ---
    if (visible.length > 0) {
      const lastVisibleItemElement = tabRefs.current[visible.length - 1];
      if (lastVisibleItemElement) {
        // 현재 보이는 모든 필터 아이템들과 그 사이의 간격들이 차지하는 총 너비
        // (컨테이너 시작점부터 마지막 아이템의 오른쪽 끝까지의 거리로 측정)
        const totalWidthOfVisibleItems = lastVisibleItemElement.getBoundingClientRect().right - containerRect.left;

        if (totalWidthOfVisibleItems > availableWidthForAllVisibleItems) {
          const itemToMove = visible[visible.length - 1];
          setVisible(prev => prev.slice(0, -1));
          setOverflows(prev => [...prev, itemToMove]); // 아이템을 overflows 배열 끝에 추가
          return; // 상태 변경 후 recalc가 다시 실행될 것임
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
      // visible 배열이 비어있으면 totalWidthOfCurrentVisibleItems는 0

      // 다음 오버플로우 아이템을 위해 필요한 너비 (아이템 너비 + 필요하다면 앞쪽 gap)
      // 이상적으로는 overflows[overflows.length - 1] 아이템의 실제 너비를 사용해야 함
      const NEXT_ITEM_ESTIMATED_WIDTH = 60; // 임시 임계값
      let spaceNeededForNextOverflowItem = NEXT_ITEM_ESTIMATED_WIDTH;
      if (visible.length > 0) { // 이미 다른 아이템들이 보인다면 새 아이템 앞에 gap 필요
        spaceNeededForNextOverflowItem += gap;
      }

      if (totalWidthOfCurrentVisibleItems + spaceNeededForNextOverflowItem <= availableWidthForAllVisibleItems) {
        const itemToMoveBack = overflows[overflows.length - 1]; // overflows 배열 끝에서 아이템 가져오기
        setVisible(prev => [...prev, itemToMoveBack]);
        setOverflows(prev => prev.slice(0, -1));
        return; // 상태 변경 후 recalc가 다시 실행될 것임
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
